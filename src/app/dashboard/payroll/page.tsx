"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/lib/company-context";
import { getPayrollStats, generatePayrollAction } from "@/actions/payroll";
import { Loader2, CheckCircle, AlertCircle, IndianRupee, Save } from "lucide-react";
import { toast } from "sonner";

export default function PayrollPage() {
    const { currentCompany } = useCompany();
    // Force refresh
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);

    // Month Selection
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const loadPayroll = async () => {
        setLoading(true);
        const [y, m] = month.split('-');
        const res = await getPayrollStats(month, parseInt(y), currentCompany);
        if (res.success && res.data) {
            setStats(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadPayroll();
    }, [month, currentCompany]);

    const handleProcess = async (employeeId: string, data: any) => {
        const [y, m] = month.split('-');
        const res = await generatePayrollAction({
            ...data,
            employeeId,
            month,
            year: parseInt(y),
            companyName: currentCompany
        });

        if (res.success) {
            toast.success("Payroll processed successfully");
            loadPayroll(); // Refresh to show "Paid/Generated" status
        } else {
            toast.error("Failed to process payroll");
        }
    };

    // Helper to update local state for manual edits before saving
    const updateLocalStat = (id: string, field: string, value: number) => {
        setStats(prev => prev.map(s => {
            if (s.id === id) {
                const updated = { ...s, [field]: value };
                // Recalculate Net
                updated.netSalary = (updated.earnedSalary || 0) + (updated.bonus || 0) + (updated.incentives || 0) - (updated.deductions || 0);
                return updated;
            }
            return s;
        }));
    };

    return (
        <PageShell title="Payroll & Wages (Live)" description="Calculate and manage monthly employee salaries.">
            {/* Header Controls */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-48"
                    />
                    <Button variant="outline" onClick={loadPayroll} disabled={loading}>
                        Refresh Data
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-2">Calculating efficiency & wages...</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {stats.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No eligible employees found for this month.</p>
                        </div>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Salary Sheet for {month}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats.map((emp) => (
                                        <div key={emp.employeeId} className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-center justify-between ${emp.isGenerated ? 'bg-green-50/50 border-green-100' : 'bg-card'}`}>

                                            {/* Employee Info */}
                                            <div className="flex-1 min-w-[200px]">
                                                <div className="font-bold text-lg">{emp.employeeName}</div>
                                                <div className="text-sm text-muted-foreground flex gap-2">
                                                    <span className="bg-secondary px-2 py-0.5 rounded text-xs">{emp.role}</span>
                                                    <span>• Base: ₹{emp.baseSalary?.toLocaleString()}</span>
                                                </div>
                                                <div className="text-xs mt-1 text-muted-foreground">
                                                    Attendance: <span className="font-medium text-foreground">{emp.attendanceDays} Days</span>
                                                </div>
                                            </div>

                                            {/* Earnings Calc */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
                                                <div>
                                                    <label className="text-[10px] uppercase text-muted-foreground font-semibold">Earned</label>
                                                    <div className="font-mono text-sm">₹{emp.earnedSalary?.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase text-muted-foreground font-semibold">
                                                        {emp.role === 'DRIVER' ? 'Trip Bonus' : 'Perf. Bonus'}
                                                    </label>
                                                    {emp.isGenerated ? (
                                                        <div className="font-mono text-sm text-green-600">+₹{emp.bonus}</div>
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            className="h-8 w-24 text-right"
                                                            value={emp.bonus}
                                                            onChange={(e) => updateLocalStat(emp.id, 'bonus', parseFloat(e.target.value) || 0)}
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase text-muted-foreground font-semibold">Deductions</label>
                                                    {emp.isGenerated ? (
                                                        <div className="font-mono text-sm text-red-600">-₹{emp.deductions}</div>
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            className="h-8 w-24 text-right text-red-600"
                                                            value={emp.deductions}
                                                            onChange={(e) => updateLocalStat(emp.id, 'deductions', parseFloat(e.target.value) || 0)}
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase text-muted-foreground font-semibold">Net Pay</label>
                                                    <div className="font-bold text-lg">₹{emp.netSalary?.toLocaleString()}</div>
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <div className="w-full md:w-auto flex justify-end">
                                                {emp.isGenerated ? (
                                                    <Button variant="outline" className="border-green-200 text-green-700 bg-green-50" disabled>
                                                        <CheckCircle className="mr-2 h-4 w-4" /> Processed
                                                    </Button>
                                                ) : (
                                                    <Button onClick={() => handleProcess(emp.employeeId, emp)}>
                                                        <Save className="mr-2 h-4 w-4" /> Process
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </PageShell>
    );
}
