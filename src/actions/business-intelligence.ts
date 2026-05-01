"use server";

import { prisma } from "@/lib/db";
import { predictBusinessIntelligence, BusinessIntelligenceRequest, BusinessIntelligenceResponse } from "@/lib/ml-insights";
import { unstable_noStore as noStore } from "next/cache";
import { format } from "date-fns";

export async function getBusinessIntelligenceAction(
    companyName: string
): Promise<{ success: boolean; data?: BusinessIntelligenceResponse; error?: string }> {
    noStore();
    try {
        // 1. Fetch Daily Revenue for the past 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const invoices = await prisma.invoice.findMany({
            where: {
                companyName,
                date: { gte: thirtyDaysAgo },
                status: { not: "CANCELLED" }
            },
            select: {
                date: true,
                totalAmount: true
            }
        });

        const dailyRevenueMap = new Map<string, number>();
        for (const inv of invoices) {
            const dateStr = format(new Date(inv.date), "yyyy-MM-dd");
            dailyRevenueMap.set(dateStr, (dailyRevenueMap.get(dateStr) || 0) + Number(inv.totalAmount || 0));
        }

        const daily_revenue = Array.from(dailyRevenueMap.entries()).map(([date, revenue]) => ({
            date,
            revenue
        }));

        // 2. Fetch Customers for RFM
        const customerRows = await prisma.customer.findMany({
            where: { companyName },
            include: { invoices: true }
        });

        const customers = customerRows.map(c => {
            const totalOrders = c.invoices.length;
            const totalRevenue = c.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
            
            const latestInvoiceDate = c.invoices.reduce<Date | null>((latest, inv) => {
                const invoiceDate = new Date(inv.date);
                if (!latest || invoiceDate > latest) return invoiceDate;
                return latest;
            }, null);

            return {
                customer_id: c.id,
                customer_name: c.name,
                last_purchase_date: latestInvoiceDate ? latestInvoiceDate.toISOString() : null,
                total_orders: totalOrders,
                total_revenue: totalRevenue
            };
        });

        const payload: BusinessIntelligenceRequest = {
            daily_revenue,
            customers
        };

        const mlRes = await predictBusinessIntelligence(payload);

        return {
            success: true,
            data: mlRes
        };

    } catch (e) {
        console.error("Business Intelligence Error:", e);
        return { success: false, error: "Failed to fetch business intelligence." };
    }
}
