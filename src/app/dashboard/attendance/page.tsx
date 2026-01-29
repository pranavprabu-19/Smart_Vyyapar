"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { useCompany } from "@/lib/company-context";
import { getEmployeesAction } from "@/actions/employee";
import { markAttendanceAction, getAttendanceAction } from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AttendancePage() {
    const { currentCompany } = useCompany();
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({}); // empId -> status
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const loadData = async () => {
            // Load Employees
            const empRes = await getEmployeesAction(currentCompany);
            if (empRes.success && empRes.employees) {
                setEmployees(empRes.employees);

                // Load Today's Attendance
                // Simplification: We should add a 'getDailyAttendance' action, but for now we can infer or fetch range
                // For MVP, just loading employees. The attendance status will be 'Unknown' initially.
            }
        };
        loadData();
    }, [currentCompany]);

    const handleMark = async (empId: string, status: string) => {
        const res = await markAttendanceAction({
            employeeId: empId,
            status: status,
            date: date,
            checkIn: status === 'PRESENT' ? "09:00" : undefined
        });

        if (res.success) {
            setAttendanceMap(prev => ({ ...prev, [empId]: status }));
            toast.success(`Marked ${status}`);
        } else {
            toast.error("Failed to mark attendance");
        }
    };

    return (
        <PageShell title="Daily Attendance" description={`Mark attendance for ${date}`}>
            <div className="mb-6">
                <input type="date" className="p-2 border rounded" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div className="grid gap-4">
                {employees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                                {emp.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-semibold">{emp.name}</div>
                                <div className="text-xs text-muted-foreground">{emp.role} • {emp.employeeId}</div>
                            </div>
                        </div>

                        <div className="flex bg-muted rounded-md p-1">
                            {['PRESENT', 'HALF_DAY', 'ABSENT'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleMark(emp.id, status)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded transition-all",
                                        attendanceMap[emp.id] === status
                                            ? status === 'PRESENT' ? 'bg-green-500 text-white' : status === 'ABSENT' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                                            : "hover:bg-background text-muted-foreground"
                                    )}
                                >
                                    {status === 'PRESENT' ? 'Present' : status === 'HALF_DAY' ? 'Half Day' : 'Absent'}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </PageShell>
    );
}
