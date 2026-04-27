"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, Activity } from "lucide-react";
import { BusinessIntelligenceResponse } from "@/lib/ml-insights";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export function BusinessIntelligenceWidget({ data }: { data?: BusinessIntelligenceResponse }) {
    if (!data) return null;

    const { forecast_next_7_days, segment_summary } = data;
    const totalPredictedRevenue = forecast_next_7_days.reduce((acc, r) => acc + r.predicted_revenue, 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue Forecast (Next 7 Days)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        ₹ {totalPredictedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="h-[120px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecast_next_7_days}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip 
                                    formatter={(value: number) => [`₹ ${value.toFixed(2)}`, "Predicted"]}
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Area type="monotone" dataKey="predicted_revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Customer Segments</CardTitle>
                    <Users className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Champions</span>
                        <span className="font-bold">{segment_summary.Champions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Loyal</span>
                        <span className="font-bold">{segment_summary.Loyal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">At Risk</span>
                        <span className="font-bold">{segment_summary["At Risk"]}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-500">
                        <span className="text-sm">Lost</span>
                        <span className="font-bold">{segment_summary.Lost}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">RFM Action Plan</CardTitle>
                    <Target className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="space-y-3">
                        <div className="text-sm">
                            <strong className="text-emerald-500">Champions:</strong> Reward with exclusive discounts.
                        </div>
                        <div className="text-sm">
                            <strong className="text-amber-500">At Risk:</strong> Send personalized re-engagement campaigns.
                        </div>
                        <div className="text-sm mt-4 text-muted-foreground flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Machine Learning dynamically updates tiers based on transactions.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
