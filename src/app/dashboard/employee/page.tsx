"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCompany } from "@/lib/company-context";
import { getEmployeeStats } from "@/actions/employee";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCcw, LogOut, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import { PageShell } from "@/components/dashboard/page-shell";

export default function EmployeeDashboard() {
    const { user, login } = useAuth();
    const { currentCompany } = useCompany();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.employeeId && user?.companyName) {
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        setLoading(true);
        if (!user?.employeeId || !user.companyName) return;

        const res = await getEmployeeStats(user.employeeId, user.companyName);
        if (res.success) {
            setStats(res);
        }
        setLoading(false);
    };

    if (!user) return <div className="p-8">Please log in.</div>;

    return (
        <PageShell title={`Welcome, ${user.name}`} description="Your daily dashboard">
            <div className="flex gap-4 mb-6">
                <Button onClick={loadStats} variant="outline" size="sm">
                    <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {/* Premium KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card variant="metric" className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                            Attendance (This Month)
                            <CalendarDays className="h-5 w-5 text-blue-600" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.attendance?.filter((a: any) => a.status === 'PRESENT').length || 0} Days</div>
                        <p className="text-xs text-muted-foreground mt-1">Present this month</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between text-emerald-600">
                            Current Status
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Role: {user.role}</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between text-purple-600">
                            Recent Activity
                            <Clock className="h-5 w-5 text-purple-600" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">{stats?.invoices?.length || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Invoices generated</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Invoices */}
            <Card variant="premium" className="mb-8">
                <CardHeader>
                    <CardTitle>My Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice No</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats?.invoices?.slice(0, 10).map((inv: any) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
                                    <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{inv.customerName}</TableCell>
                                    <TableCell className="text-right">₹{inv.totalAmount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-xs">{inv.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!stats?.invoices || stats.invoices.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No invoices generated yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </PageShell>
    );
}
