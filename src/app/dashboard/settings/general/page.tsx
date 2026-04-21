"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Download, KeyRound, Copy } from "lucide-react";
import { exportDatabaseAction } from "@/actions/backup";
import { rotateAdminPasswordAction } from "@/actions/admin-credentials";
import { useCompany } from "@/lib/company-context";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function GeneralSettingsPage() {
    const { currentCompany } = useCompany();
    const { user } = useAuth();
    const [targetEmail, setTargetEmail] = useState("admin@smartvyapar.local");
    const [newPassword, setNewPassword] = useState("");
    const [latest, setLatest] = useState<{ email: string; password: string; companyName?: string | null } | null>(null);
    const [rotating, setRotating] = useState(false);
    const [hideIn, setHideIn] = useState<number | null>(null);

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

    const handleRotateAdmin = async () => {
        setRotating(true);
        try {
            const res = await rotateAdminPasswordAction({
                targetEmail: targetEmail.trim() || undefined,
                newPassword: newPassword.trim() || undefined,
            });
            if (!res.success || !res.credentials) {
                toast.error(res.error || "Failed to rotate admin password");
                return;
            }
            setLatest(res.credentials);
            setHideIn(30);
            setNewPassword("");
            toast.success("Admin password rotated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to rotate admin password");
        } finally {
            setRotating(false);
        }
    };

    useEffect(() => {
        if (hideIn === null) return;
        if (hideIn <= 0) {
            setLatest(null);
            setHideIn(null);
            return;
        }
        const t = setTimeout(() => setHideIn((s) => (s === null ? null : s - 1)), 1000);
        return () => clearTimeout(t);
    }, [hideIn]);

    const handleCopyCredentials = async () => {
        if (!latest) return;
        const text = `Email: ${latest.email}\nPassword: ${latest.password}\nCompany: ${latest.companyName || "-"}`;
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Credentials copied to clipboard");
        } catch {
            toast.error("Could not copy credentials");
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

                {user?.role === "ADMIN" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <KeyRound className="h-5 w-5" /> Admin Credentials
                            </CardTitle>
                            <CardDescription>
                                Rotate an ADMIN login password. Existing password is never shown; new value appears once after reset.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Target Admin Email</label>
                                    <Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">New Password (optional)</label>
                                    <Input
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Leave empty to auto-generate"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">
                                    Tip: Keep this value secure. Login currently uses plain-text password comparison in MVP mode.
                                </p>
                                <Button variant="outline" onClick={handleRotateAdmin} disabled={rotating || !targetEmail.trim()}>
                                    Rotate Password
                                </Button>
                            </div>
                            {latest && (
                                <div className="rounded-md border p-3 bg-muted/40 text-sm">
                                    <div><span className="font-medium">Email:</span> {latest.email}</div>
                                    <div><span className="font-medium">Password:</span> {latest.password}</div>
                                    <div><span className="font-medium">Company:</span> {latest.companyName || "-"}</div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Hidden automatically in {hideIn ?? 0}s
                                        </span>
                                        <Button variant="secondary" size="sm" onClick={handleCopyCredentials}>
                                            <Copy className="h-3 w-3 mr-1" /> Copy
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-end">
                    <Button>Save Changes</Button>
                </div>
            </div>
        </PageShell>
    );
}
