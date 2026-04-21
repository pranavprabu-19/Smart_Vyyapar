"use server"

import type { RecommendationResponse, Suggestion } from '@/types/recommendations'
import { getMlServiceBaseUrl } from "@/lib/ml-service-base-url"

const ML_URL = getMlServiceBaseUrl()
const ML_SECRET = process.env.ML_API_SECRET || "dev-secret"

export async function getRecommendations(
    productId: string
): Promise<Suggestion[]> {
    if (!ML_URL) {
        console.warn("ML service not configured - skipping recommendations")
        return []
    }

    try {
        const res = await fetch(`${ML_URL}/recommend/${productId}`, {
            headers: { "x-api-secret": ML_SECRET },
            next: { revalidate: 3600 } // cache suggestions 1 hour
        })

        if (!res.ok) return []

        const data: RecommendationResponse = await res.json()
        return data.suggestions
    } catch (e) {
        // ML service down - fail silently, never break invoicing
        console.warn("Failed to fetch ML recommendations:", e)
        return []
    }
}

export async function triggerRetrain(): Promise<boolean> {
    try {
        const res = await fetch(`${ML_URL}/retrain`, {
            method: "POST",
            headers: { "x-api-secret": ML_SECRET }
        })
        return res.ok
    } catch {
        return false
    }
}

export async function predictStockoutML(dailySales: number[], currentStock: number) {
    if (!ML_URL) return null;
    
    try {
        const res = await fetch(`${ML_URL}/predict-stockout`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-api-secret": ML_SECRET 
            },
            body: JSON.stringify({
                daily_sales: dailySales,
                current_stock: currentStock
            })
        });
        
        if (!res.ok) return null;
        
        return await res.json() as {
            avg_daily_sales: number;
            days_until_stockout: number;
            reorder_now: boolean;
        };
    } catch (e) {
        console.warn("Failed to fetch ML stock prediction:", e);
        return null;
    }
}


