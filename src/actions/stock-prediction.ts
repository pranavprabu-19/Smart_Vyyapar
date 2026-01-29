"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

export interface StockPrediction {
    sku: string;
    productName: string;
    currentStock: number;
    avgDailySales: number;
    daysLeft: number;
    status: "SAFE" | "LOW" | "CRITICAL";
    reorderQuantity: number;
    predictedStockoutDate: string | null;
}

export async function predictStockoutAction(companyName: string): Promise<{ success: boolean; predictions?: StockPrediction[]; error?: string }> {
    noStore();
    try {
        // 1. Fetch Products
        const products = await prisma.product.findMany({
            where: { companyName }
        });

        if (!products.length) return { success: true, predictions: [] };

        // 2. Fetch Sales History (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const invoices = await prisma.invoice.findMany({
            where: {
                companyName,
                date: { gte: thirtyDaysAgo }
            },
            include: { items: true }
        });

        // 3. Calculate Total Sales per SKU in last 30 days
        const salesMap: Record<string, number> = {};

        invoices.forEach(inv => {
            inv.items.forEach(item => {
                if (!salesMap[item.productId]) salesMap[item.productId] = 0;
                salesMap[item.productId] += item.quantity;
            });
        });

        // 4. Generate Predictions
        const predictions: StockPrediction[] = products.map(product => {
            const totalSold30d = salesMap[product.sku] || 0;
            const avgDailySales = totalSold30d / 30; // Simple average

            let daysLeft = 999;
            if (avgDailySales > 0) {
                daysLeft = Math.floor(product.stock / avgDailySales);
            }

            let status: "SAFE" | "LOW" | "CRITICAL" = "SAFE";
            if (daysLeft <= 0) status = "CRITICAL"; // Already out or will be today
            else if (daysLeft <= 7) status = "CRITICAL"; // Less than a week
            else if (daysLeft <= 15) status = "LOW"; // Less than 2 weeks

            // Override if stock is literally below minStock
            if (product.stock <= product.minStock) {
                status = "CRITICAL";
                if (daysLeft > 7) daysLeft = 7; // Force urgency
            }

            // Predicted Date
            let predictedDate: string | null = null;
            if (daysLeft < 365) {
                const d = new Date();
                d.setDate(d.getDate() + daysLeft);
                predictedDate = d.toISOString().split('T')[0];
            }

            return {
                sku: product.sku,
                productName: product.name,
                currentStock: product.stock,
                avgDailySales: parseFloat(avgDailySales.toFixed(2)),
                daysLeft,
                status,
                // @ts-ignore
                reorderQuantity: product.reorderQuantity || 50,
                predictedStockoutDate: predictedDate
            };
        });

        // Sort by urgency (Critical first)
        predictions.sort((a, b) => a.daysLeft - b.daysLeft);

        return { success: true, predictions };

    } catch (error) {
        console.error("Prediction Error:", error);
        return { success: false, error: "Failed to calculate predictions" };
    }
}
