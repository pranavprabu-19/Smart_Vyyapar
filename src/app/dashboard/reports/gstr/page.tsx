"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileText } from "lucide-react";
import { getGSTR1Data } from "@/actions/report";
import { useCompany } from "@/lib/company-context";

export default function GstrReportsPage() {
    const { currentCompany } = useCompany();

    const reports = [
        {
            id: 'gstr1',
            name: 'GSTR-1',
            desc: 'Details of outward supplies (Sales)',
            period: 'Monthly',
            color: 'text-blue-600'
        },
        {
            id: 'gstr2',
            name: 'GSTR-2A/2B',
            desc: 'Auto-drafted details of inward supplies (Purchases)',
            period: 'Real-time',
            color: 'text-green-600'
        },
        {
            id: 'gstr3b',
            name: 'GSTR-3B',
            desc: 'Summary return of outward supplies & input tax credit',
            period: 'Monthly',
            color: 'text-purple-600'
        },
        {
            id: 'gstr9',
            name: 'GSTR-9',
            desc: 'Annual Return',
            period: 'Annual',
            color: 'text-orange-600'
        },
    ];

    const handleDownload = async (id: string, name: string) => {
        if (id === 'gstr1') {
            const now = new Date();
            // Default to current month for demo
            const res = await getGSTR1Data(now.getMonth() + 1, now.getFullYear(), currentCompany);
            if (res.success) {
                // Create JSON Blob
                const dataStr = JSON.stringify(res, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `GSTR1_${now.toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                alert("GSTR-1 Data Downloaded Successfully! Use this JSON for filing or CA review.");
            } else {
                alert("Failed to fetch GSTR-1 Data");
            }
        } else {
            alert(`Real data export for ${name} coming in next update! (GSTR-1 is fully active)`);
        }
    };

    return (
        <PageShell title="GST Reports & Filing" description="Generate GSTR-1, 3B, and 9 for easy filing.">
            <div className="grid gap-6 md:grid-cols-2">
                {reports.map((r) => (
                    <Card key={r.id} variant="premium">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <FileText className={r.color} />
                                {r.name}
                            </CardTitle>
                            <span className="text-xs px-2 py-1 bg-muted rounded-full font-medium">{r.period}</span>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="mb-4">{r.desc}</CardDescription>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => handleDownload(r.id, r.name)}>
                                    <FileDown className="mr-2 h-4 w-4" /> JSON
                                </Button>
                                <Button variant="secondary" className="flex-1" onClick={() => handleDownload(r.id, r.name)}>
                                    <FileDown className="mr-2 h-4 w-4" /> Excel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-8 p-4 bg-muted/20 border rounded-lg">
                <h3 className="font-semibold mb-2">Vyapar TaxOne Integration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Send detailed data directly to your Chartered Accountant or Tax Professional using Vyapar TaxOne format.
                </p>
                <Button>Connect with CA</Button>
            </div>
        </PageShell>
    );
}
