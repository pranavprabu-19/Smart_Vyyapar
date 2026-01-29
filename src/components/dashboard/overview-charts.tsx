"use client";


import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface OverviewChartsProps {
    graphData?: { name: string; total: number }[];
    recentSales?: { id: string; name: string; location: string; amount: number }[];
}

export function OverviewCharts({ graphData, recentSales }: OverviewChartsProps) {
    const hasData = graphData && graphData.length > 0;
    const hasSales = recentSales && recentSales.length > 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card variant="premium" className="col-span-4">
                <CardHeader>
                    <CardTitle>Weekly Revenue</CardTitle>
                    <CardDescription>Daily sales performance for the current week.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={graphData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--primary))', opacity: 0.1 }}
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: '1px solid hsl(var(--border))', 
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                        backgroundColor: 'hsl(var(--card))'
                                    }}
                                    formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                                />
                                <Bar 
                                    dataKey="total" 
                                    fill="url(#colorRevenue)" 
                                    radius={[8, 8, 0, 0]} 
                                    barSize={50}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <p className="text-sm">No revenue data available</p>
                                <p className="text-xs mt-1">Data will appear here as sales are recorded</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card variant="premium" className="col-span-3">
                <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>Latest transactions from distribution network.</CardDescription>
                </CardHeader>
                <CardContent>
                    {hasSales ? (
                        <div className="space-y-6">
                            {recentSales.map((sale, i) => (
                                <div className="flex items-center animate-in fade-in slide-in-from-bottom-4" key={sale.id} style={{ animationDelay: `${i * 50}ms` }}>
                                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-primary font-bold text-xs">
                                            {sale.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 space-y-1 flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-none truncate" title={sale.name}>
                                            {sale.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {sale.location}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-bold text-sm text-green-600">
                                        +₹{sale.amount.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-muted-foreground">
                            <p className="text-sm">No recent sales data</p>
                            <p className="text-xs mt-1">Sales transactions will appear here</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
