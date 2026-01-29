"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPayrollStats(month: string, year: number, companyName: string) {
    try {
        // 1. Get all employees (excluding Sales Officers)
        const employees = await prisma.employee.findMany({
            where: {
                companyName,
                status: "ACTIVE",
                role: { not: "SO_OFFICIER" }
            },
            include: {
                attendance: {
                    where: {
                        date: {
                            gte: new Date(year, parseInt(month.split('-')[1]) - 1, 1),
                            lt: new Date(year, parseInt(month.split('-')[1]), 1)
                        }
                    }
                }
            }
        });

        const payrollData = await Promise.all(employees.map(async (emp) => {
            // Check if payroll already exists
            const existing = await prisma.payroll.findUnique({
                where: {
                    employeeId_month: {
                        employeeId: emp.id,
                        month: month
                    }
                }
            });

            if (existing) return { ...existing, employeeName: emp.name, role: emp.role, isGenerated: true };

            // Calculate Metrics
            const daysInMonth = new Date(year, parseInt(month.split('-')[1]), 0).getDate();
            const presentDays = emp.attendance.filter(a => a.status === 'PRESENT').length;
            const halfDays = emp.attendance.filter(a => a.status === 'HALF_DAY').length;
            const effectiveDays = presentDays + (halfDays * 0.5);

            // 1. Base Salary Calculation
            const perDaySalary = emp.baseSalary / daysInMonth;
            const earnedSalary = Math.round(perDaySalary * effectiveDays);

            // 2. Efficiency Bonuses
            let bonus = 0;
            let tripIncentives = 0;

            // Driver: Trip Bonus
            if (emp.role === "DRIVER") {
                // Find trips completed by this driver in this month
                const trips = await prisma.trip.findMany({
                    where: {
                        driverName: emp.name,
                        status: "COMPLETED",
                        endTime: {
                            gte: new Date(year, parseInt(month.split('-')[1]) - 1, 1),
                            lt: new Date(year, parseInt(month.split('-')[1]), 1)
                        }
                    }
                });
                // Calculate Trip Bonus (₹50/trip) + Trip Allowances
                bonus += trips.length * 50;

                // Sum of allowances entered in Trip Sheets
                tripIncentives = trips.reduce((sum, t) => sum + (t.allowance || 0), 0);
            }

            // Employee: Full Attendance Bonus
            // If effectiveDays >= 25, give ₹500
            if (effectiveDays >= 25) {
                bonus += 500;
            }

            return {
                id: "preview-" + emp.id,
                employeeId: emp.id,
                employeeName: emp.name,
                role: emp.role,
                month,
                year,
                baseSalary: emp.baseSalary,
                attendanceDays: effectiveDays,
                earnedSalary,
                bonus,
                incentives: tripIncentives,
                deductions: 0,
                netSalary: earnedSalary + bonus,
                status: "PENDING",
                isGenerated: false
            };
        }));

        return { success: true, data: payrollData };

    } catch (error) {
        console.error("Payroll Stats Error:", error);
        return { success: false, error: "Failed to calculate payroll" };
    }
}

export async function generatePayrollAction(data: any) {
    try {
        // Upsert payroll record
        const record = await prisma.payroll.upsert({
            where: {
                employeeId_month: {
                    employeeId: data.employeeId,
                    month: data.month
                }
            },
            update: {
                earnedSalary: data.earnedSalary,
                bonus: data.bonus,
                incentives: data.incentives,
                deductions: data.deductions,
                netSalary: data.netSalary,
                status: data.status,
                attendanceDays: data.attendanceDays
            },
            create: {
                employeeId: data.employeeId,
                month: data.month,
                year: data.year,
                baseSalary: data.baseSalary,
                attendanceDays: data.attendanceDays,
                earnedSalary: data.earnedSalary,
                bonus: data.bonus,
                incentives: data.incentives,
                deductions: data.deductions,
                netSalary: data.netSalary,
                status: data.status
            }
        });

        revalidatePath("/dashboard/payroll");
        return { success: true, record };
    } catch (error) {
        console.error("Generate Payroll Error:", error);
        return { success: false, error: "Failed to generate payroll" };
    }
}
