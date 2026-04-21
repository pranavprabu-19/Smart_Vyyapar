"use client"

import { useState, useTransition, useEffect } from "react"
import { getRecommendations, ProductRecommendation } from "@/lib/ml-insights"
import { Sparkles, X } from "lucide-react"

interface Props {
    productId: string | null;
    productName: string | null;
    onAddItem: (productId: string) => void;
}

export function SuggestionBanner({ productId, productName, onAddItem }: Props) {
    const [suggestions, setSuggestions] = useState<ProductRecommendation[]>([])
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        if (!productId) {
            setSuggestions([])
            return
        }

        startTransition(async () => {
            try {
                const recs = await getRecommendations({ productIds: [productId], topN: 5 })
                if (recs && recs.product_recommendations) {
                    setSuggestions(recs.product_recommendations)
                }
            } catch (e) {
                console.warn("Could not fetch recommendations");
            }
        })
    }, [productId])

    function acceptSuggestion(s: ProductRecommendation) {
        onAddItem(s.product_id)
        // Remove accepted suggestion from the list
        setSuggestions(prev => prev.filter(r => r.product_id !== s.product_id))
    }

    if (suggestions.length === 0) return null

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-3 my-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-blue-900">
                    Customers buying <strong className="font-semibold">{productName}</strong> also buy:
                </p>
                <button 
                    onClick={() => setSuggestions([])}
                    className="ml-auto text-blue-400 hover:text-blue-600 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                    <button
                        key={s.product_id}
                        onClick={() => acceptSuggestion(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700 transition-colors shadow-sm group"
                    >
                        {/* We don't have product name natively in ProductRecommendation unless provided by backend logic. For now, show ID or if category exists, but realistically the old suggestion returned productName. Let's just output ID if name isn't there, or maybe Product ID is the name?? Wait, ProductRecommendation contains product_id, confidence, lift, category. */}
                        {s.product_id}
                        <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[10px] group-hover:bg-blue-200 transition-colors">
                            {s.confidence}% match
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}
