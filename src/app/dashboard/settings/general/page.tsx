"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Download } from "lucide-react";
import { exportDatabaseAction } from "@/actions/backup";
import { useCompany } from "@/lib/company-context";

export default function GeneralSettingsPage() {
    const { currentCompany } = useCompany();

    const handleBackup = async () => {
        const res = await exportDatabaseAction(currentCompany);
        if (res.success && res.data) {
            const dataStr = JSON.stringify(res.data, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `SmartVyapar_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            alert("Backup Downloaded Successfully!");
        } else {
            alert("Backup failed.");
        }
    };

    return (
        <PageShell title="General Settings" description="Manage global application preferences.">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Application Details</CardTitle>
                        <CardDescription>Basic information about your store instance.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Store Name</label>
                                <Input defaultValue="SmartVyapar Store" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Financial Year</label>
                                <Input defaultValue="2024-2025" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" /> Data Management
                        </CardTitle>
                        <CardDescription>Secure your business data.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="font-medium">Export Database</p>
                            <p className="text-sm text-muted-foreground">Download all customers, invoices, and product data as JSON.</p>
                        </div>
                        <Button onClick={handleBackup} variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Backup Data
                        </Button>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button>Save Changes</Button>
                </div>
            </div>
        </PageShell>
    );
}
