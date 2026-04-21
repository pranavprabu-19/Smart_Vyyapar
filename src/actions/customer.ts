"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Customer } from "@prisma/client";
import { getScopedCompanyName } from "@/lib/company-scope";
import { syncCustomerCreditFromBalance } from "@/lib/customerCredit";

function normalizePhone(phone?: string): string | undefined {
    const digits = String(phone || "").replace(/\D/g, "");
    return digits ? digits : undefined;
}

function normalizeGstin(gstin?: string): string | undefined {
    const trimmed = (gstin || "").trim();
    return trimmed ? trimmed.toUpperCase() : undefined;
}

export interface CreateCustomerData {
    id?: string;
    name: string;
    address: string;
    state: string;
    gstin?: string;
    phone?: string;
    email?: string;
    lastInvoiceNo?: string;
    companyName?: string;
    lat?: number;
    lng?: number;
}

export async function saveCustomerAction(data: CreateCustomerData) {
    try {
        const scopedCompany = await getScopedCompanyName(data.companyName);
        const normalized = {
            ...data,
            companyName: scopedCompany,
            phone: normalizePhone(data.phone),
            gstin: normalizeGstin(data.gstin),
            email: (data.email || "").trim() || undefined,
            name: (data.name || "").trim(),
            address: (data.address || "").trim(),
            state: (data.state || "").trim(),
        } satisfies CreateCustomerData;
        let existingCustomer = null;

        // 1. Try to find by ID if provided (explicit update)
        if (normalized.id) {
            existingCustomer = await prisma.customer.findUnique({ where: { id: normalized.id } });
            if (existingCustomer && existingCustomer.companyName !== scopedCompany) {
                return { success: false, error: "Access denied: customer does not belong to the selected company." };
            }
        }

        // 2. If not found by ID (or no ID), try GSTIN
        if (!existingCustomer && normalized.gstin) {
            const anyByGstin = await prisma.customer.findUnique({ where: { gstin: normalized.gstin } });
            if (anyByGstin && anyByGstin.companyName !== scopedCompany) {
                return {
                    success: false,
                    error: `GSTIN '${normalized.gstin}' already exists under '${anyByGstin.companyName}'.`,
                };
            }
            existingCustomer = await prisma.customer.findFirst({
                where: { gstin: normalized.gstin, companyName: scopedCompany },
            });
        }

        // 3. If still not found, try Name + Company
        if (!existingCustomer) {
            existingCustomer = await prisma.customer.findFirst({
                where: { name: normalized.name, companyName: scopedCompany }
            });
        }

        let result;
        if (existingCustomer) {
            // Update
            result = await prisma.customer.update({
                where: { id: existingCustomer.id },
                data: {
                    ...normalized,
                }
            });
        } else {
            // Create
            result = await prisma.customer.create({
                data: {
                    ...normalized,
                    lat: normalized.lat,
                    lng: normalized.lng,
                    // Ensure empty string GSTIN becomes undefined/null to avoid unique constraint error
                    gstin: normalized.gstin || undefined,
                }
            });
        }

        revalidatePath("/dashboard/invoices");
        return { success: true, customer: result };
    } catch (error) {
        console.error("Failed to save customer:", error);
        return { success: false, error: "Database Error" };
    }
}

export async function getCustomersAction(companyName: string = "Sai Associates"): Promise<{ success: boolean; customers?: Customer[]; error?: string }> {
    try {
        const scopedCompany = await getScopedCompanyName(companyName);
        const customers = await prisma.customer.findMany({
            where: { companyName: scopedCompany },
            orderBy: { name: 'asc' }
        });
        return { success: true, customers };
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return { success: false, customers: [] };
    }
}

export async function getCustomerDetails(id: string, companyName?: string) {
    try {
        const scopedCompany = await getScopedCompanyName(companyName);
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                invoices: {
                    orderBy: { date: 'desc' },
                }
            }
        });

        if (!customer) return { success: false, error: "Customer not found" };
        if (customer.companyName !== scopedCompany) {
            return { success: false, error: "Access denied: customer does not belong to the selected company." };
        }

        return { success: true, customer };
    } catch (error) {
        console.error("Failed to fetch customer details:", error);
        return { success: false, error: "Database Error" };
    }
}

export async function addCustomerPayment(customerId: string, amount: number, mode: string, companyName?: string) {
    try {
        const scopedCompany = await getScopedCompanyName(companyName);
        const existing = await prisma.customer.findUnique({ where: { id: customerId }, select: { companyName: true } });
        if (!existing) return { success: false, error: "Customer not found" };
        if (existing.companyName !== scopedCompany) {
            return { success: false, error: "Access denied: customer does not belong to the selected company." };
        }
        await prisma.$transaction(async (tx) => {
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    balance: { decrement: amount },
                }
            });
            await syncCustomerCreditFromBalance({ customerId, tx });
        });

        revalidatePath(`/dashboard/customers/${customerId}`);
        revalidatePath("/dashboard/customers");
        return { success: true };
    } catch (error) {
        console.error("Failed to add payment:", error);
        return { success: false, error: "Database Error" };
    }
}

type StatementEntry = {
    date: string;
    type: "INVOICE" | "PAYMENT";
    refNo: string;
    description: string;
    debit: number;
    credit: number;
    runningBalance: number;
    source: string;
    status: string;
};

function toCsv(rows: Record<string, string | number>[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    return [
        headers.join(","),
        ...rows.map((row) =>
            headers
                .map((header) => {
                    const v = row[header];
                    const s = String(v ?? "");
                    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
                        return `"${s.replace(/"/g, "\"\"")}"`;
                    }
                    return s;
                })
                .join(",")
        ),
    ].join("\n");
}

export async function getCustomerStatementAction(input: {
    customerId: string;
    companyName?: string;
}) {
    try {
        const scopedCompany = await getScopedCompanyName(input.companyName);
        const customer = await prisma.customer.findUnique({
            where: { id: input.customerId },
            include: {
                invoices: {
                    orderBy: { date: "asc" },
                    select: { id: true, invoiceNo: true, date: true, totalAmount: true, paidAmount: true, status: true },
                },
                payments: {
                    orderBy: { collectedAt: "asc" },
                    where: {
                        status: {
                            in: ["RECEIVED", "DEPOSITED", "CLEARED"],
                        },
                    },
                    select: {
                        paymentNo: true,
                        collectedAt: true,
                        amount: true,
                        mode: true,
                        reference: true,
                        status: true,
                        invoice: { select: { invoiceNo: true } },
                    },
                },
            },
        });

        if (!customer) return { success: false, error: "Customer not found" };
        if (customer.companyName !== scopedCompany) {
            return { success: false, error: "Access denied: customer does not belong to the selected company." };
        }

        const entries: StatementEntry[] = [];
        customer.invoices.forEach((inv) => {
            entries.push({
                date: inv.date.toISOString(),
                type: "INVOICE",
                refNo: inv.invoiceNo,
                description: `Invoice ${inv.invoiceNo} (${inv.status})`,
                debit: inv.totalAmount,
                credit: 0,
                runningBalance: 0,
                source: "INVOICE_POSTING",
                status: inv.status,
            });
        });
        customer.payments.forEach((pay) => {
            entries.push({
                date: pay.collectedAt.toISOString(),
                type: "PAYMENT",
                refNo: pay.paymentNo,
                description: `Payment ${pay.mode}${pay.invoice?.invoiceNo ? ` for ${pay.invoice.invoiceNo}` : ""}`,
                debit: 0,
                credit: pay.amount,
                runningBalance: 0,
                source: "PAYMENT_RECEIPT",
                status: pay.status,
            });
        });

        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const movementDelta = entries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
        const openingBalance = Number((Number(customer.balance || 0) - movementDelta).toFixed(2));
        let running = openingBalance;
        const datedEntries = entries.map((entry) => {
            running += entry.debit - entry.credit;
            return {
                ...entry,
                date: new Date(entry.date).toLocaleDateString("en-IN"),
                runningBalance: Number(running.toFixed(2)),
            };
        });

        const invoiceTotal = customer.invoices
            .filter((i) => i.status !== "CANCELLED")
            .reduce((s, i) => s + i.totalAmount, 0);
        const paymentTotal = customer.payments.reduce((s, p) => s + p.amount, 0);
        const outstanding = Number(customer.balance || 0);
        const fileBase = `statement-${customer.name.replace(/[^\w.-]+/g, "_").slice(0, 40)}`;

        const csvRows = datedEntries.map((e) => ({
            Date: e.date,
            Type: e.type,
            Reference: e.refNo,
            Description: e.description,
            Source: e.source,
            Status: e.status,
            Debit: e.debit.toFixed(2),
            Credit: e.credit.toFixed(2),
            Balance: e.runningBalance.toFixed(2),
        }));
        const csv = toCsv(csvRows);

        return {
            success: true,
            statement: {
                customer: {
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    companyName: customer.companyName,
                },
                totals: {
                    invoiceTotal,
                    paymentTotal,
                    openingBalance,
                    outstanding,
                },
                entries: datedEntries,
            },
            csv,
            fileNameBase: fileBase,
        };
    } catch (error) {
        console.error("Failed to build customer statement:", error);
        return { success: false, error: "Failed to generate customer statement" };
    }
}
