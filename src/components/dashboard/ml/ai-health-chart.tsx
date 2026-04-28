"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StockPrediction } from "@/actions/stock-prediction";

interface AIHealthChartProps {
    predictions: StockPrediction[];
}

export function AIHealthChart({ predictions }: AIHealthChartProps) {
    const [chartsReady, setChartsReady] = useState(false);

    useEffect(() => {
        setChartsReady(true);
    }, []);

    const summary = { SAFE: 0, LOW: 0, CRITICAL: 0 };
    predictions.forEach(p => summary[p.status]++);

    const data = [
        { name: "Healthy / Slow", value: summary.SAFE, color: "#10b981" }, // emerald-500
        { name: "Low Stock", value: summary.LOW, color: "#f59e0b" }, // amber-500
        { name: "Critical", value: summary.CRITICAL, color: "#ef4444" }, // red-500
    ].filter(d => d.value > 0);

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle>AI Inventory Health</CardTitle>
                <CardDescription>Machine Learning stock categorization</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
                {predictions.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No AI predictions available
                    </div>
                ) : !chartsReady ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Loading chart...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
