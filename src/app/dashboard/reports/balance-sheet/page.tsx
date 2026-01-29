"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, Building, ArrowDownToLine, ArrowUpFromLine, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBalanceSheetReport, BalanceSheetData } from "@/actions/reports";
import { useCompany } from "@/lib/company-context";

export default function BalanceSheetPage() {
    const { currentCompany } = useCompany();
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<BalanceSheetData | null>(null);

    const loadReport = async () => {
        setLoading(true);
        const res = await getBalanceSheetReport(currentCompany);
        if (res.success && res.data) {
            setReport(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadReport();
    }, [currentCompany]);

    if (loading) {
        return (
            <PageShell title="Balance Sheet" description="Financial statement summarizing assets, liabilities, and equity.">
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Calculating Assets & Liabilities...</p>
                </div>
            </PageShell>
        );
    }

    if (!report) {
        return (
            <PageShell title="Balance Sheet" description="Financial statement." >
                <div className="p-8 text-center border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Failed to load report. Please try again.</p>
                    <Button onClick={loadReport} variant="outline" className="mt-4">Retry</Button>
                </div>
            </PageShell>
        );
    }

    const { assets, liabilities, equity, stockDetails } = report;

    return (
        <PageShell title="Balance Sheet" description="Financial statement summarizing assets, liabilities, and equity with detailed stock valuation.">

            {/* Top Level Summary */}
            <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={loadReport}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card className="border-green-200 bg-green-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Total Assets</CardTitle>
                        <ArrowUpFromLine className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-800">₹{assets.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-green-600">Fixed + Current</p>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">Total Liabilities</CardTitle>
                        <ArrowDownToLine className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-800">₹{liabilities.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-red-600">Loans + Payables</p>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Total Equity</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-800">₹{equity.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-blue-600">Capital + Net Profit</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Detailed Assets Statement */}
                <Card>
                    <CardHeader>
                        <CardTitle>Assets Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm underline">Current Assets</h4>
                            <div className="flex justify-between text-sm">
                                <span>Closing Stock</span>
                                <span className="font-bold">₹{assets.closingStock.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Sundry Debtors (Receivable)</span>
                                <span>₹{assets.receivables.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Cash in Hand</span>
                                <span>₹{assets.cash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span>Bank Accounts</span>
                                <span>₹{assets.bank.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-green-700 pt-1">
                                <span>Total Current Assets</span>
                                <span>₹{assets.totalCurrent.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4">
                            <h4 className="font-semibold text-sm underline">Fixed Assets</h4>
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span>Machinery & Vehicles</span>
                                <span>₹{assets.fixed.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-green-700 pt-1">
                                <span>Total Fixed Assets</span>
                                <span>₹{assets.fixed.toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Liabilities & Equity Statement */}
                <Card>
                    <CardHeader>
                        <CardTitle>Liabilities & Equity Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm underline">Current Liabilities</h4>
                            <div className="flex justify-between text-sm">
                                <span>Sundry Creditors (Payable)</span>
                                <span>₹{liabilities.sundryCreditors.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Duties & Taxes (GST)</span>
                                <span>₹{liabilities.gstPayable.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span>Wages Payable (Pending Payroll)</span>
                                <span className="text-red-500 font-medium">₹{liabilities.pendingPayroll.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-red-700 pt-1">
                                <span>Total Current Liabilities</span>
                                <span>₹{liabilities.totalCurrent.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4">
                            <h4 className="font-semibold text-sm underline">Loans (Liability)</h4>
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span>Bank Loan (HDFC)</span>
                                <span>₹{liabilities.bankLoan.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4">
                            <h4 className="font-semibold text-sm underline">Equity</h4>
                            <div className="flex justify-between text-sm">
                                <span>Capital Account</span>
                                <span>₹{equity.capital.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span>Reserves & Surplus (Net Profit)</span>
                                <span>₹{equity.netProfit.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-blue-700 pt-1">
                                <span>Total Equity</span>
                                <span>₹{equity.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Closing Stock Detailed Report (Requested Feature) */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Closing Stock Valuation</CardTitle>
                        <CardDescription>
                            Detailed breakdown of current inventory cost and quantity in Godown.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead className="text-right">Godown Qty</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        <TableHead className="text-right">Total Value</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stockDetails.map((p: any) => (
                                        <TableRow key={p.sku}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell className="text-right font-bold">{p.stock.toLocaleString()} PCS</TableCell>
                                            <TableCell className="text-right text-muted-foreground">₹{p.costPrice.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold">₹{p.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={p.stock < (p.minStock || 10) ? "destructive" : "outline"} className="text-xs">
                                                    {p.stock < (p.minStock || 10) ? "Low Stock" : "In Stock"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Total Row */}
                                    <TableRow className="bg-muted/50 font-bold">
                                        <TableCell colSpan={2} className="text-right">Grand Total</TableCell>
                                        <TableCell className="text-right">{stockDetails.reduce((s: number, p: any) => s + p.stock, 0).toLocaleString()} PCS</TableCell>
                                        <TableCell className="text-right">-</TableCell>
                                        <TableCell className="text-right">₹{assets.closingStock.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageShell>
    );
}
