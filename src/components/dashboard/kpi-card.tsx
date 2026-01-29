"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


interface KPICardProps {
    title: string;
    value: number;
    change: number | null;
    changeLabel: string;
    icon: React.ReactNode;
    gradient: string;
    borderColor: string;
    index: number;
}

export function KPICard({ title, value, change, changeLabel, icon, gradient, borderColor, index }: KPICardProps) {
    const isCurrency = title.includes("Revenue") || title.includes("Payments") || title.includes("Stock Value");
    const displayValue = isCurrency ? `₹${value.toLocaleString()}` : value.toLocaleString();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card variant="metric" className={`bg-gradient-to-br ${gradient} border ${borderColor} relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center border ${borderColor}`}>
                        {icon}
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-3xl font-bold mb-1">{displayValue}</div>
                    {change !== null ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className={`h-3 w-3 ${change > 0 ? 'text-green-600' : 'text-red-600'}`} />
                            <span className={change > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {change > 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">{changeLabel}</span>
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">{changeLabel}</p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
