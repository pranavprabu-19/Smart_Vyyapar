"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import { mlFeatureFlags } from "@/lib/ml-feature-flags";

export interface StockPrediction {
    sku: string;
    productId: string;
    productName: string;
    currentStock: number;
    avgDailySales: number;
    daysLeft: number;
    status: "SAFE" | "LOW" | "CRITICAL";
    mlStatus?: "OUT_OF_STOCK" | "CRITICAL_LOW" | "SLOW_MOVING" | "OVERSTOCK" | "HEALTHY";
    reorderQuantity: number;
    predictedStockoutDate: string | null;
    holdingCostEstimate?: number;
    isLiquidationCandidate?: boolean;
    liquidationReason?: string | null;
}

export async function predictStockoutAction(companyName: string): Promise<{
    success: boolean;
    predictions?: StockPrediction[];
    liquidationSummary?: {
        candidates: number;
        estimatedHoldingCost: number;
    };
    error?: string;
}> {
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

        // 3. Calculate Daily Sales Arrays for ML
        const salesMap: Record<string, number[]> = {};
        products.forEach(p => { salesMap[p.id] = new Array(30).fill(0); });
        
        const today = new Date();
        today.setHours(0,0,0,0);

        invoices.forEach(inv => {
            const invDate = new Date(inv.date);
            invDate.setHours(0,0,0,0);
            const diffTime = Math.abs(today.getTime() - invDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays < 30) {
                const dayIndex = 29 - diffDays; // 0 is 30 days ago, 29 is today
                inv.items.forEach(item => {
                    if (salesMap[item.productId]) {
                        salesMap[item.productId][dayIndex] += item.quantity;
                    }
                });
            }
        });

        // 4. Generate Predictions using Python ML Backend
        const { getStockInsights } = await import("@/lib/ml-insights");
        
        const productInputs = products.map(product => {
            const dailySales = salesMap[product.id] || new Array(30).fill(0);
            const totalSold30d = dailySales.reduce((a, b) => a + b, 0);
            const avgDailySales = totalSold30d / 30;
            return {
                product_id: product.id,
                product_name: product.name,
                quantity_sold: totalSold30d,
                sale_date: thirtyDaysAgo.toISOString().split("T")[0],
                category: product.category,
                current_stock: product.stock,
                purchase_price: Number(product.costPrice ?? 0),
                selling_price: Number(product.price ?? 0),
                supplier_lead_time_days: 7,
                recent_daily_sales: dailySales,
                avgDailySales,
            };
        });

        let insights: any[] = [];
        try {
            const insightsRes = await getStockInsights(productInputs);
            insights = insightsRes.products;
        } catch (e: any) {
            console.warn("ML Service offline, falling back to basic math", e?.message || String(e));
        }

        const predictions = products.map((product) => {
            const insight = insights.find(i => i.product_id === product.id);
            const dailySales = salesMap[product.id] || new Array(30).fill(0);
            
            let avgDailySales = 0;
            let daysLeft = 999;
            let status: "SAFE" | "LOW" | "CRITICAL" = "SAFE";
            let reorderQty = (product as any).reorderQuantity || 50;

            if (insight) {
                avgDailySales = productInputs.find(p => p.product_id === product.id)?.avgDailySales || 0;
                daysLeft = insight.days_of_stock_remaining;
                
                // Map status from backend
                if (insight.stock_status === "CRITICAL_LOW" || insight.stock_status === "OUT_OF_STOCK") status = "CRITICAL";
                else if (insight.stock_status === "SLOW_MOVING") status = "SAFE";
                else if (insight.stock_status === "OVERSTOCK") status = "SAFE";
                else if (avgDailySales > 0 && daysLeft <= 15) status = "LOW";
                
                reorderQty = insight.suggested_reorder_qty;
            } else {
                // Fallback math
                const totalSold30d = dailySales.reduce((a, b) => a + b, 0);
                avgDailySales = totalSold30d / 30;
                if (avgDailySales > 0) {
                    daysLeft = Math.floor(product.stock / avgDailySales);
                }

                if (daysLeft <= 0) status = "CRITICAL";
                else if (daysLeft <= 7) status = "CRITICAL";
                else if (daysLeft <= 15) status = "LOW";
            }

            // Literal minimum stock override
            if (product.stock <= product.minStock) {
                status = "CRITICAL";
                if (daysLeft > 7) daysLeft = 7;
            }

            // Predicted Date
            let predictedDate: string | null = null;
            if (daysLeft < 365 && daysLeft >= 0) {
                const d = new Date();
                d.setDate(d.getDate() + Math.floor(daysLeft));
                predictedDate = d.toISOString().split('T')[0];
            }

            return {
                sku: product.sku,
                productId: product.id,
                productName: product.name,
                currentStock: product.stock,
                avgDailySales: parseFloat(avgDailySales.toFixed(2)),
                daysLeft,
                status,
                reorderQuantity: reorderQty,
                predictedStockoutDate: predictedDate,
                mlStatus: insight?.stock_status,
                holdingCostEstimate: insight?.holding_cost_estimate || 0,
                isLiquidationCandidate:
                    Boolean(insight?.stock_status === "SLOW_MOVING" || insight?.stock_status === "OVERSTOCK") &&
                    daysLeft > 90 &&
                    avgDailySales <= 0.25,
                liquidationReason:
                    daysLeft > 90 && avgDailySales <= 0.25
                        ? "High days of stock with low velocity"
                        : null,
            };
        });

        // Sort by urgency (Critical first)
        predictions.sort((a, b) => a.daysLeft - b.daysLeft);

        const liquidationCandidates = predictions.filter((p) => p.isLiquidationCandidate);
        const estimatedHoldingCost = liquidationCandidates.reduce(
            (sum, p) => sum + (p.holdingCostEstimate || 0),
            0
        );

        return {
            success: true,
            predictions,
            liquidationSummary: {
                candidates: liquidationCandidates.length,
                estimatedHoldingCost: Number(estimatedHoldingCost.toFixed(2)),
            },
        };

    } catch (error) {
        console.error("Prediction Error:", error);
        return { success: false, error: "Failed to calculate predictions" };
    }
}

export async function refreshLiquidationCandidates(companyName: string): Promise<{
    success: boolean;
    flagged: number;
    estimatedHoldingCost: number;
    error?: string;
}> {
    try {
        const res = await predictStockoutAction(companyName);
        if (!res.success || !res.predictions) {
            return { success: false, flagged: 0, estimatedHoldingCost: 0, error: res.error || "Prediction failed" };
        }

        const candidates = res.predictions.filter((p) => p.isLiquidationCandidate);
        const estimatedHoldingCost = candidates.reduce((sum, p) => sum + (p.holdingCostEstimate || 0), 0);

        if (mlFeatureFlags.enableLiquidationWriteback) {
            try {
                await prisma.product.updateMany({
                    where: { companyName },
                    data: {
                        isLiquidationCandidate: false,
                        liquidationReason: null,
                        liquidationFlaggedAt: null,
                    },
                });
                const flaggedAt = new Date();
                for (const item of candidates) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: {
                            isLiquidationCandidate: true,
                            liquidationReason: item.liquidationReason || "ML low-velocity with >90 days stock",
                            liquidationFlaggedAt: flaggedAt,
                        },
                    });
                }
            } catch {
                // Ignore if migration not yet applied.
            }
        }

        return {
            success: true,
            flagged: candidates.length,
            estimatedHoldingCost: Number(estimatedHoldingCost.toFixed(2)),
        };
    } catch (error: any) {
        return { success: false, flagged: 0, estimatedHoldingCost: 0, error: error?.message || String(error) };
    }
}
