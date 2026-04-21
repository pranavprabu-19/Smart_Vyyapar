"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportCAEWaySummaryAction, exportCASalesRegisterAction } from "@/actions/ca-portal";
import { getCurrentServerSessionAction } from "@/actions/session";

function downloadCsv(fileName: string, csv: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

export default function CAPortalPage() {
    const { user, logout } = useAuth();
    const [month, setMonth] = useState(String(new Date().getMonth() + 1));
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [loadingSales, setLoadingSales] = useState(false);
    const [loadingEWay, setLoadingEWay] = useState(false);
    const [serverSessionState, setServerSessionState] = useState<{
        loading: boolean;
        verified: boolean;
        mismatch: boolean;
        message: string;
    }>({
        loading: true,
        verified: false,
        mismatch: false,
        message: "Checking server session...",
    });

    const companyName = user?.companyName || "";
    const isCA = user?.role === "CA" || user?.role === "AUDITOR";
    const canUse = Boolean(isCA && companyName);

    const periodLabel = useMemo(
        () => `${year}-${String(month).padStart(2, "0")}`,
        [month, year]
    );

    useEffect(() => {
        let mounted = true;
        const checkServerSession = async () => {
            try {
                const res = await getCurrentServerSessionAction();
                if (!mounted) return;
                if (!res.success || !res.session) {
                    setServerSessionState({
                        loading: false,
                        verified: false,
                        mismatch: true,
                        message: "No valid server session found.",
                    });
                    return;
                }

                const roleMatch = res.session.role === user?.role;
                const companyMatch =
                    (res.session.companyName || "") === (user?.companyName || "") || res.session.role === "ADMIN";

                const mismatch = !roleMatch || !companyMatch;
                setServerSessionState({
                    loading: false,
                    verified: !mismatch,
                    mismatch,
                    message: mismatch
                        ? "Client and server session details do not fully match."
                        : "Server session is verified.",
                });
            } catch {
                if (!mounted) return;
                setServerSessionState({
                    loading: false,
                    verified: false,
                    mismatch: true,
                    message: "Failed to verify server session.",
                });
            }
        };
        checkServerSession();
        return () => {
            mounted = false;
        };
    }, [user?.role, user?.companyName]);

    if (!user) {
        return (
            <main className="min-h-screen grid place-items-center p-6">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>CA Portal</CardTitle>
                        <CardDescription>Please log in to continue.</CardDescription>
                    </CardHeader>
                </Card>
            </main>
        );
    }

    if (!isCA) {
        return (
            <main className="min-h-screen grid place-items-center p-6">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Access Restricted</CardTitle>
                        <CardDescription>This portal is only for CA/Auditor users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={logout} variant="outline">Logout</Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    const runSalesExport = async () => {
        if (!canUse) return;
        setLoadingSales(true);
        try {
            const res = await exportCASalesRegisterAction({
                companyName,
                month: Number(month),
                year: Number(year),
                caUserEmail: user.email,
            });
            if (!res.success) {
                toast.error("Failed to export sales register.");
                return;
            }
            if (!res.fileName || !res.csv) {
                toast.error("Sales export returned empty file payload.");
                return;
            }
            downloadCsv(res.fileName, res.csv);
            toast.success(`Sales register exported (${res.rowCount} rows).`);
        } finally {
            setLoadingSales(false);
        }
    };

    const runEWayExport = async () => {
        if (!canUse) return;
        setLoadingEWay(true);
        try {
            const res = await exportCAEWaySummaryAction({
                companyName,
                month: Number(month),
                year: Number(year),
                caUserEmail: user.email,
            });
            if (!res.success) {
                toast.error("Failed to export E-Way summary.");
                return;
            }
            if (!res.fileName || !res.csv) {
                toast.error("E-Way export returned empty file payload.");
                return;
            }
            downloadCsv(res.fileName, res.csv);
            toast.success(`E-Way summary exported (${res.rowCount} rows).`);
        } finally {
            setLoadingEWay(false);
        }
    };

    return (
        <main className="min-h-screen p-6 md:p-8 bg-muted/10">
            <div className="mx-auto max-w-4xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>CA Portal</CardTitle>
                        <CardDescription>
                            Read-only statutory exports for {companyName}. Period: {periodLabel}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="caMonth">Month</Label>
                            <Input id="caMonth" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="caYear">Year</Label>
                            <Input id="caYear" type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" onClick={logout}>Logout</Button>
                        </div>
                        <div className="md:col-span-3">
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={
                                        serverSessionState.loading
                                            ? "secondary"
                                            : serverSessionState.verified
                                              ? "default"
                                              : "destructive"
                                    }
                                >
                                    {serverSessionState.loading
                                        ? "Verifying"
                                        : serverSessionState.verified
                                          ? "Server Session Verified"
                                          : "Server Session Warning"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{serverSessionState.message}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sales Register (GSTR-1)</CardTitle>
                        <CardDescription>CSV export of outward supplies with invoice-line detail.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={runSalesExport} disabled={loadingSales || !canUse}>
                            {loadingSales ? "Exporting..." : "Download Sales Register CSV"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>E-Way Bill Summary</CardTitle>
                        <CardDescription>CSV export from E-Way audit activity logs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={runEWayExport} disabled={loadingEWay || !canUse}>
                            {loadingEWay ? "Exporting..." : "Download E-Way Summary CSV"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Purchase Register (Placeholder)</CardTitle>
                        <CardDescription>
                            Purchase-side export will be enabled after purchase-bill model integration.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled variant="secondary">Coming Soon</Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
