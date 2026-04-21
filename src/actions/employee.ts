"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateStrongTempPassword, hashPassword } from "@/lib/password";

export async function createEmployeeAction(data: {
    name: string;
    employeeId: string;
    role: string;
    phone: string; // Mandatory
    email?: string;
    aadhaar?: string; // Validated in FE: Aadhaar OR PAN
    pan?: string;
    baseSalary: number;
    companyName: string;
}) {
    // Auto-generate ID if not provided specific logic
    let finalEmployeeId = data.employeeId;

    console.log("Creating Emp:", data); // Debug log

    if (!finalEmployeeId || finalEmployeeId.trim() === "") {
        console.log("Generating ID for", data.companyName);

        const lastEmployee = await prisma.employee.findFirst({
            where: {
                companyName: data.companyName,
                employeeId: { startsWith: "EMP-" }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (lastEmployee) {
            const parts = lastEmployee.employeeId.split("-");
            if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
                const lastNum = parseInt(parts[1]);
                finalEmployeeId = `EMP-${String(lastNum + 1).padStart(3, '0')}`;
            } else {
                // Fallback if parsing fails but starts with EMP-
                finalEmployeeId = `EMP-${Date.now().toString().slice(-4)}`;
            }
        } else {
            finalEmployeeId = "EMP-001";
        }
    }

    try {
        const newEmployee = await prisma.employee.create({
            data: {
                name: data.name,
                employeeId: finalEmployeeId,
                role: data.role,
                phone: data.phone,
                email: data.email,
                aadhaar: data.aadhaar,
                pan: data.pan,
                baseSalary: Number(data.baseSalary),
                companyName: data.companyName,
                status: "ACTIVE"
            }
        });
        revalidatePath("/dashboard/employees");
        return { success: true, employee: newEmployee };
    } catch (error) {
        console.error("Error creating employee:", error);
        return { success: false, error: "Failed to create employee" };
    }
}

export async function getEmployeesAction(companyName: string) {
    try {
        const employees = await prisma.employee.findMany({
            where: { companyName },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, employees };
    } catch (error) {
        console.error("Error fetching employees:", error);
        return { success: false, error: "Failed to fetch employees" };
    }
}

export async function updateEmployeeAction(data: {
    id: string; // DB ID
    name: string;
    role: string;
    email?: string;
    phone: string;
    aadhaar?: string;
    pan?: string;
    baseSalary: number;
}) {
    try {
        const updated = await prisma.employee.update({
            where: { id: data.id },
            data: {
                name: data.name,
                role: data.role,
                email: data.email,
                phone: data.phone,
                aadhaar: data.aadhaar,
                pan: data.pan,
                baseSalary: Number(data.baseSalary)
            }
        });
        revalidatePath("/dashboard/employees");
        return { success: true, employee: updated };
    } catch (error) {
        console.error("Error updating employee:", error);
        return { success: false, error: "Failed to update employee" };
    }
}

export async function createEmployeeLoginAction(employeeId: string, email: string, role: string) {
    try {
        const password = generateStrongTempPassword(12);
        const hashed = await hashPassword(password);

        // Find employee to get company name
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId }
        });

        if (!employee) return { success: false, error: "Employee not found" };

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email }
        });

        if (existingUser) {
            // Case 1: Same Employee -> Reset Password
            if (existingUser.employeeId === employeeId) {
                await prisma.user.update({
                    where: { email: email },
                    data: { password: hashed, role: role } // Ensure role is synced
                });
                return { success: true, user: existingUser, tempPassword: password, message: "Password Reset Successful" };
            }
            // Case 2: Different User -> Error
            else {
                return { success: false, error: "Email is already used by another user account." };
            }
        }

        const newUser = await prisma.user.create({
            data: {
                name: employee.name,
                email: email,
                password: hashed,
                role: role,
                companyName: employee.companyName,
                employeeId: employee.id
            }
        });

        return { success: true, user: newUser, tempPassword: password };
    } catch (error: any) {
        console.error("Error creating login:", error);

        // Handle Unique Constraint Violation (P2002)
        if (error.code === 'P2002') {
            return { success: false, error: "Login already exists for this email." };
        }

        return { success: false, error: error.message || "Failed to create login" };
    }
}

export async function getEmployeeStats(employeeId: string, companyName: string) {
    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                employeeId: employeeId,
                companyName: companyName
            },
            orderBy: { date: 'desc' },
            include: { customer: true }
        });

        const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const invoiceCount = invoices.length;

        // Get Attendance for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const attendance = await prisma.attendance.findMany({
            where: {
                employeeId: employeeId,
                date: { gte: startOfMonth }
            },
            orderBy: { date: 'desc' }
        });

        return {
            success: true,
            invoices,
            totalSales,
            invoiceCount,
            attendance
        };
    } catch (error) {
        console.error("Stats Error:", error);
        return { success: false, error: "Failed to fetch stats" };
    }
}
