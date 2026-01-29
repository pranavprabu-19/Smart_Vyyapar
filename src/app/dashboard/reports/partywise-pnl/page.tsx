"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useInvoice } from "@/lib/invoice-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertCircle } from "lucide-react";

interface PartyStats {
    name: string;
    invoiceCount: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
}

export default function PartywisePnLPage() {
    const { invoices } = useInvoice();

    // Group invoices by Customer Name
    const customerStats: Record<string, PartyStats> = {};

    invoices.forEach(inv => {
        const customerName = inv.customer.name;

        if (!customerStats[customerName]) {
            customerStats[customerName] = {
                name: customerName,
                invoiceCount: 0,
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0
            };
        }

        // Calculate metrics for this invoice
        const revenue = inv.items.reduce((sum, item) => sum + (item.price * item.quantity), 0); // Taxable Revenue
        let cost = 0;
        let profit = 0;

        inv.items.forEach(item => {
            const itemCost = (item.costPrice || (item.price * 0.7)) * item.quantity;
            const itemRevenue = item.price * item.quantity;
            cost += itemCost;
            profit += (itemRevenue - itemCost);
        });

        customerStats[customerName].invoiceCount += 1;
        customerStats[customerName].totalRevenue += revenue;
        customerStats[customerName].totalCost += cost;
        customerStats[customerName].totalProfit += profit;
    });

    // Convert to array and sort by Profit Descending
    const reportData = Object.values(customerStats).sort((a, b) => b.totalProfit - a.totalProfit);

    // Identify Most Profitable Customer
    const topCustomer = reportData.length > 0 ? reportData[0] : null;

    return (
        <PageShell
            title="Partywise Profit & Loss"
            description="Track profitability per customer based on sales history."
        >
            <div className="space-y-6">

                {/* Insights Section */}
                {topCustomer && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-green-700">Top Performing Customer</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-green-800">{topCustomer.name}</div>
                                <p className="text-sm text-green-600 mt-1">Generated <b>₹{topCustomer.totalProfit.toFixed(0)}</b> in profit across {topCustomer.invoiceCount} orders.</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Customer Analysis</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{reportData.length}</div>
                                <p className="text-xs text-muted-foreground">Active customers with sales history</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Main Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Profitability Report</CardTitle>
                        <CardDescription>
                            Aggregated profit and margin data by customer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer Name</TableHead>
                                        <TableHead className="text-center">Invoices</TableHead>
                                        <TableHead className="text-right">Total Sales</TableHead>
                                        <TableHead className="text-right">Total Cost</TableHead>
                                        <TableHead className="text-right">Total Profit</TableHead>
                                        <TableHead className="text-right">Avg Margin %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                No customer sales data available.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        reportData.map((row) => {
                                            const margin = row.totalRevenue > 0 ? (row.totalProfit / row.totalRevenue) * 100 : 0;
                                            return (
                                                <TableRow key={row.name}>
                                                    <TableCell className="font-medium">{row.name}</TableCell>
                                                    <TableCell className="text-center">{row.invoiceCount}</TableCell>
                                                    <TableCell className="text-right">₹{row.totalRevenue.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">₹{row.totalCost.toFixed(2)}</TableCell>
                                                    <TableCell className={`text-right font-bold ${row.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        ₹{row.totalProfit.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={`${margin > 25 ? 'bg-green-50 text-green-700 border-green-200' : 'text-muted-foreground'}`}>
                                                            {margin.toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageShell>
    );
}
