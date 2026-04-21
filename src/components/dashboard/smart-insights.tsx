"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, TrendingUp, AlertTriangle, Truck, ArrowRight, DollarSign, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

export type SmartInsight = {
    id: string;
    type: "low_stock" | "outstanding" | "growth" | "top_product" | "trip" | "alert";
    title: string;
    description: string;
    value?: string;
    href?: string;
    severity?: "info" | "warning" | "success";
};

interface SmartInsightsProps {
    insights: SmartInsight[];
}

export function SmartInsights({ insights }: SmartInsightsProps) {
    const [currentIndex, setCurrentIndex] = useState(0)

    const displayInsights = insights.length > 0 ? insights : [];

    useEffect(() => {
        if (displayInsights.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % displayInsights.length)
        }, 8000)
        return () => clearInterval(timer)
    }, [displayInsights.length])

    const currentInsight = displayInsights[currentIndex]

    if (!currentInsight) return null;

    const getIcon = (type: SmartInsight["type"]) => {
        switch (type) {
            case "low_stock": return <AlertTriangle className="h-5 w-5 text-red-500" />
            case "outstanding": return <DollarSign className="h-5 w-5 text-orange-500" />
            case "growth": return <TrendingUp className="h-5 w-5 text-emerald-500" />
            case "trip": return <Truck className="h-5 w-5 text-blue-500" />
            default: return <Sparkles className="h-5 w-5 text-indigo-500" />
        }
    }

    const getColor = (type: SmartInsight["type"]) => {
        switch (type) {
            case "low_stock": return "bg-red-500/10 border-red-500/20"
            case "outstanding": return "bg-orange-500/10 border-orange-500/20"
            case "growth": return "bg-emerald-500/10 border-emerald-500/20"
            case "trip": return "bg-blue-500/10 border-blue-500/20"
            default: return "bg-indigo-500/10 border-indigo-500/20"
        }
    }

    return (
        <Card variant="neon" className="relative overflow-hidden min-h-[180px]">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="h-24 w-24 text-primary" />
            </div>

            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    Smart Insights
                </CardTitle>
            </CardHeader>

            <CardContent>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentInsight.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${getColor(currentInsight.type)}`}>
                                {getIcon(currentInsight.type)}
                            </div>
                            <div className="space-y-1 flex-1">
                                <h4 className="font-semibold text-base">{currentInsight.title}</h4>
                                <p className="text-sm text-muted-foreground">{currentInsight.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            {currentInsight.value && (
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary/50 border border-secondary">
                                    Impact: {currentInsight.value}
                                </span>
                            )}
                            
                            {currentInsight.href ? (
                                <Link href={currentInsight.href}>
                                    <Button variant="ghost" size="sm" className="group text-primary hover:text-primary/80">
                                        View Details
                                        <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </Link>
                            ) : (
                                <div />
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="flex justify-center gap-1 mt-4">
                    {displayInsights.map((_, idx) => (
                        <div
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted'}`}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
