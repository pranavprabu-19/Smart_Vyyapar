"use server";

import { prisma } from "@/lib/db";
import { predictPaymentDefault, CustomerPaymentInput, PaymentDefaultResult } from "@/lib/ml-insights";
import { unstable_noStore as noStore } from "next/cache";
import { sendWhatsAppRiskAlert } from "@/lib/whatsapp";
import { mlFeatureFlags } from "@/lib/ml-feature-flags";

export async function predictCustomerRiskAction(
    companyName: string
): Promise<{ success: boolean; data?: PaymentDefaultResult[]; summary?: Record<string, number>; error?: string }> {
    noStore();
    try {
        // Fetch all customers with their invoices
        const customers = await prisma.customer.findMany({
            where: { companyName },
            include: {
                invoices: true,
                credit: true,
            }
        });

        if (!customers || customers.length === 0) {
            return { success: true, data: [] };
        }

        const now = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);

        const creditNoteRows = await prisma.creditNote.groupBy({
            by: ["customerId"],
            where: {
                companyName,
                createdAt: { gte: ninetyDaysAgo },
                status: { not: "CANCELLED" },
            },
            _count: { _all: true },
        });
        const creditNotesLast90ByCustomer = new Map(
            creditNoteRows.map((row) => [row.customerId, row._count._all])
        );

        const modelInputs: CustomerPaymentInput[] = customers.map((c) => {
            const totalOrders = c.invoices.length;
            const totalPurchases = c.invoices.reduce(
                (sum, inv) => sum + Number(inv.totalAmount ?? 0),
                0
            );
            const averageOrderValue = totalOrders > 0 ? totalPurchases / totalOrders : 0;
            const invoicesLast90Days = c.invoices.filter((i) => new Date(i.date) >= ninetyDaysAgo).length;

            const latestInvoiceDate = c.invoices.reduce<Date | null>((latest, inv) => {
                const invoiceDate = new Date(inv.date);
                if (!latest || invoiceDate > latest) return invoiceDate;
                return latest;
            }, null);
            const daysSinceLastPurchase = latestInvoiceDate
                ? Math.max(0, Math.floor((now.getTime() - latestInvoiceDate.getTime()) / (1000 * 60 * 60 * 24)))
                : 120;

            const paymentFrequency = totalOrders > 0
                ? Math.max(1, 30 / Math.max(totalOrders, 1))
                : 30;

            return {
                customer_id: c.id,
                customer_name: c.name,
                total_purchases: totalPurchases,
                outstanding_balance: Number(c.credit?.currentBalance ?? c.balance ?? 0),
                days_since_last_purchase: daysSinceLastPurchase,
                payment_frequency: paymentFrequency,
                average_order_value: averageOrderValue,
                total_orders: totalOrders,
                credit_limit: Number(c.credit?.creditLimit ?? 0),
                invoices_last_90_days: invoicesLast90Days,
                credit_notes_last_90_days: creditNotesLast90ByCustomer.get(c.id) ?? 0,
            };
        });

        const mlRes = await predictPaymentDefault({ customers: modelInputs });

        return {
            success: true,
            data: mlRes.customers,
            summary: {
                tier_a: mlRes.summary.tier_a,
                tier_b: mlRes.summary.tier_b,
                tier_c: mlRes.summary.tier_c,
                auto_limit_reduction_candidates: mlRes.summary.auto_limit_reduction_candidates,
            }
        };
    } catch (e) {
        console.error("Prediction Error:", e);
        return { success: false, error: "Failed to predict customer risk properly." };
    }
}

export async function runCreditLimitAutomationJob(companyName: string): Promise<{
    success: boolean;
    processed: number;
    reduced: number;
    notified: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let processed = 0;
    let reduced = 0;
    let notified = 0;

    try {
        if (!mlFeatureFlags.enableCreditAutomation) {
            return { success: true, processed: 0, reduced: 0, notified: 0, errors: [] };
        }

        const riskRes = await predictCustomerRiskAction(companyName);
        if (!riskRes.success || !riskRes.data?.length) {
            return { success: true, processed: 0, reduced: 0, notified: 0, errors: [] };
        }

        const riskyCustomers = riskRes.data.filter(
            (c) => c.recommended_limit_action === "REDUCE_LIMIT" && c.risk_score >= 0.7
        );

        const customerRows = await prisma.customer.findMany({
            where: { companyName, id: { in: riskyCustomers.map((c) => c.customer_id) } },
            include: { credit: true, company: true },
        });
        const customerMap = new Map(customerRows.map((c) => [c.id, c]));

        for (const customerRisk of riskyCustomers) {
            processed += 1;
            const customer = customerMap.get(customerRisk.customer_id);
            if (!customer?.credit) continue;

            const currentLimit = Number(customer.credit.creditLimit ?? 0);
            if (currentLimit <= 0) continue;

            const reducedLimit = Number(Math.max(currentLimit * 0.8, 0).toFixed(2));
            if (reducedLimit >= currentLimit) continue;

            await prisma.customerCredit.update({
                where: { id: customer.credit.id },
                data: {
                    creditLimit: reducedLimit,
                    availableCredit: Math.max(0, reducedLimit - Number(customer.credit.currentBalance ?? 0)),
                },
            });
            reduced += 1;

            try {
                await prisma.creditLimitAction.create({
                    data: {
                        customerCreditId: customer.credit.id,
                        companyId: customer.companyId,
                        companyName,
                        previousLimit: currentLimit,
                        newLimit: reducedLimit,
                        riskScore: customerRisk.risk_score,
                        policyAction: "REDUCE_LIMIT",
                        reason: "Auto-reduced by ML risk automation job",
                        notificationStatus: "PENDING",
                    },
                });
            } catch {
                // Migration may not be applied yet; do not fail credit adjustment.
            }

            if (customer.phone) {
                try {
                    await sendWhatsAppRiskAlert({
                        to: customer.phone,
                        customerName: customer.name,
                        previousLimit: currentLimit,
                        newLimit: reducedLimit,
                        riskScore: customerRisk.risk_score,
                    });
                    notified += 1;
                } catch (notifyErr: any) {
                    errors.push(`Notification failed for ${customer.name}: ${notifyErr?.message || String(notifyErr)}`);
                }
            }
        }

        return {
            success: true,
            processed,
            reduced,
            notified,
            errors,
        };
    } catch (e: any) {
        return {
            success: false,
            processed,
            reduced,
            notified,
            errors: [...errors, e?.message || String(e)],
        };
    }
}
