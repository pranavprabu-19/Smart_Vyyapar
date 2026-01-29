"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useInvoice } from "@/lib/invoice-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default function BillwisePnLPage() {
    const { invoices } = useInvoice();

    // Calculate Bill-wise Stats
    const reportData = invoices.map(inv => {
        const revenue = inv.totalAmount;

        // Calculate Cost & Profit
        let totalCost = 0;
        let totalProfit = 0;

        inv.items.forEach(item => {
            const costPerUnit = item.costPrice || (item.price * 0.7); // Fallback to 70% if no historical cost
            const itemTotalCost = costPerUnit * item.quantity;
            const itemRevenue = item.price * item.quantity;

            totalCost += itemTotalCost;
            totalProfit += (itemRevenue - itemTotalCost);
        });

        // Calculate Margin Percentage: (Profit / Revenue) * 100
        // Note: Revenue here excludes tax for pure margin calc usually, but we use the stored totalAmount which includes tax?
        // Let's refine: item.price is taxable value. totalAmount is with Tax.
        // Pure Profit Margin should be on Taxable Value ideally.
        // Let's stick to: Profit = (SellingPrice - CostPrice) * Qty.
        // Margin % = (Profit / (Total Cost + Profit)) * 100 usually (Markup) or (Profit / Revenue)
        // Let's use (Profit / TaxableRevenue) for accuracy or just (Profit / TotalCost) for ROI.
        // User asked for "Profit Margins".

        const taxableRevenue = inv.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const marginPercent = taxableRevenue > 0 ? (totalProfit / taxableRevenue) * 100 : 0;

        return {
            ...inv,
            revenue: taxableRevenue, // Showing Taxable Revenue for P&L mostly
            grossAmount: revenue, // Invoice Total (with Tax)
            totalCost,
            totalProfit,
            marginPercent
        };
    });

    // Summary Stats
    const totalRevenue = reportData.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = reportData.reduce((sum, item) => sum + item.totalProfit, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return (
        <PageShell
            title="Billwise Profit & Loss"
            description="Analyze profit margins on every single invoice generated."
        >
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sales (Taxable)</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">Excluding GST</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Gross Profit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">₹{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">Realized profit from sales</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Profit Margin</CardTitle>
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{avgMargin.toFixed(2)}%</div>
                            <p className="text-xs text-muted-foreground">Average Return on Sales</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Invoice Profit Breakdown</CardTitle>
                        <CardDescription>
                            Showing {reportData.length} records. Sorted by latest.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Sales (Taxable)</TableHead>
                                        <TableHead className="text-right">Cost (Est)</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
                                        <TableHead className="text-right">Margin %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No invoices found. Generate sales in POS to see data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        reportData.slice().reverse().map((row) => (
                                            <TableRow key={row.invoiceNo}>
                                                <TableCell>{row.date}</TableCell>
                                                <TableCell className="font-medium">{row.invoiceNo}</TableCell>
                                                <TableCell>{row.customer.name}</TableCell>
                                                <TableCell className="text-right">₹{row.revenue.toFixed(2)}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">₹{row.totalCost.toFixed(2)}</TableCell>
                                                <TableCell className={`text-right font-bold ${row.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ₹{row.totalProfit.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={row.marginPercent > 20 ? "default" : (row.marginPercent > 0 ? "secondary" : "destructive")}>
                                                        {row.marginPercent.toFixed(2)}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
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
