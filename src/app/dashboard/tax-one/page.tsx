"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/company-context";
import { useEffect, useState } from "react";
import { getTaxSummaryAction, TaxSummary } from "@/actions/tax";
import { Loader2, Send, FileSpreadsheet, CheckCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TaxOnePage() {
    const { currentCompany } = useCompany();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TaxSummary | null>(null);
    const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());

    useEffect(() => {
        loadData();
    }, [currentCompany, month, year]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getTaxSummaryAction(currentCompany, parseInt(month), parseInt(year));
            setData(res);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load tax data");
        } finally {
            setLoading(false);
        }
    };

    const handleSendToCA = () => {
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 2000)),
            {
                loading: 'Packaging data & securely sending to CA...',
                success: 'Data sent successfully via TaxOne Secure Link!',
                error: 'Transmission failed'
            }
        );
    };

    return (
        <PageShell
            title="Vyapar TaxOne Integration"
            description="Seamlessly share financial data with your Chartered Accountant."
            action={
                <div className="flex gap-2">
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[120px] bg-white">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">January</SelectItem>
                            <SelectItem value="12">December</SelectItem>
                            {/* Shortened for demo */}
                        </SelectContent>
                    </Select>
                </div>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Main Data Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Tax Summary: {data?.period}</CardTitle>
                        <CardDescription>Consolidated GST and Sales Data</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground uppercase">Total Sales</p>
                                        <p className="text-2xl font-bold">₹{data?.totalSales.toFixed(0)}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground uppercase">Output Tax</p>
                                        <p className="text-2xl font-bold text-red-600">₹{data?.totalTax.toFixed(0)}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground uppercase">Invoices</p>
                                        <p className="text-2xl font-bold">{data?.invoiceCount}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground uppercase">B2B / B2C</p>
                                        <p className="text-lg font-bold">{data?.b2bCount} / {data?.b2cCount}</p>
                                    </div>
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 font-medium text-slate-700">
                                            <tr>
                                                <th className="p-3 text-left">Tax Component</th>
                                                <th className="p-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr>
                                                <td className="p-3">CGST (Central Tax)</td>
                                                <td className="p-3 text-right">₹{data?.gstBreakdown.cgst.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3">SGST (State Tax)</td>
                                                <td className="p-3 text-right">₹{data?.gstBreakdown.sgst.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3">IGST (Integrated Tax)</td>
                                                <td className="p-3 text-right">₹{data?.gstBreakdown.igst.toFixed(2)}</td>
                                            </tr>
                                            <tr className="bg-slate-50 font-bold">
                                                <td className="p-3">Total Liability</td>
                                                <td className="p-3 text-right">₹{data?.totalTax.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* CA Connection Card */}
                <div className="space-y-6">
                    <Card className="bg-blue-600 text-white border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5" /> TaxOne Secure
                            </CardTitle>
                            <CardDescription className="text-blue-100">
                                Connect with your CA for real-time filing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-blue-100">CA Email / Code</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-sm text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                                            placeholder="ca@example.com"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleSendToCA} className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold">
                                    <Send className="w-4 h-4 mr-2" /> Send Data to CA
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-sm">Quick Exports</CardTitle></CardHeader>
                        <CardContent className="grid gap-2">
                            <Button variant="outline" className="w-full justify-start">
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                Download GSTR-1 Excel
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                Download Sales Register
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </PageShell>
    );
}
