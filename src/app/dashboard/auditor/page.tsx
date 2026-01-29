"use client";

import { FileText, TrendingUp, AlertCircle, Download, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { shareReportOnWhatsApp } from "@/lib/share-utils";

export default function AuditorPage() {
    const reports = [
        { title: "GSTR-1 (Sales)", status: "Filed", date: "Oct 2024" },
        { title: "GSTR-3B (Summary)", status: "Pending", date: "Nov 2024" },
        { title: "Inventory Valuation", status: "Ready", date: "Today" },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Auditor Dashboard</h2>
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Download All Reports
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tax Liability</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹12,450</div>
                        <p className="text-xs text-muted-foreground">Est. for Nov 2024</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Audits</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">2</div>
                        <p className="text-xs text-muted-foreground">Stock discrepancies found</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">14</div>
                        <p className="text-xs text-muted-foreground">In last 30 days</p>
                    </CardContent>
                </Card>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">GST Reports & Filings</h3>
            <div className="grid gap-4">
                {reports.map((report) => (
                    <Card key={report.title} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-semibold">{report.title}</h4>
                                <p className="text-sm text-muted-foreground">Period: {report.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${report.status === "Filed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                report.status === "Pending" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                }`}>
                                {report.status}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => shareReportOnWhatsApp(report.title, { Status: report.status, Period: report.date })}
                            >
                                <Share2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">View</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
