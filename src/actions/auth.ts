"use server";

import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/auth-context";

export async function loginAction(identifier: string, password?: string, companyName?: string) {
    try {
        // 1. Try finding by Email first (Standard User)
        let user = await prisma.user.findUnique({
            where: { email: identifier }
        });

        // 2. If not found by email, try finding Employee by (employeeId + companyName) -> linked User
        if (!user && companyName) {
            // Find Employee first
            const employee = await prisma.employee.findFirst({
                where: {
                    employeeId: identifier,
                    companyName: companyName
                }
            });

            if (employee) {
                // Find the User linked to this Employee
                user = await prisma.user.findFirst({
                    where: {
                        employeeId: employee.id, // Linked by DB ID, not custom ID
                        companyName: companyName
                    }
                });
            }
        }

        if (!user) {
            return { success: false, error: "User not found" };
        }

        // 3. Verify Password
        // For MVP, if password is randomly generated string, we compare directly.
        // In prod, use bcrypt.compare(password, user.password)
        if (user.password !== password) {
            return { success: false, error: "Invalid credentials" };
        }

        // 4. Return User Data (excluding password)
        return {
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role as UserRole,
                companyName: user.companyName,
                employeeId: user.employeeId // DB ID of employee record
            }
        };

    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "Login failed" };
    }
}
