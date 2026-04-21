"use server";

import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/auth-context";
import { clearServerSession, setServerSession } from "@/lib/server-session";
import { hashPassword, isHashedPassword, verifyPassword } from "@/lib/password";

export async function loginAction(identifier: string, password?: string, companyName?: string) {
    try {
        const normalizedIdentifier = (identifier || "").trim();
        const normalizedPassword = (password || "").trim();
        const normalizedCompanyName = companyName?.trim();

        // 1. Try finding by Email first (Standard User)
        let user = await prisma.user.findUnique({
            where: { email: normalizedIdentifier }
        });

        // 2. If not found by email, try finding Employee by (employeeId + companyName) -> linked User
        if (!user && normalizedCompanyName) {
            // Find Employee first
            const employee = await prisma.employee.findFirst({
                where: {
                    employeeId: normalizedIdentifier,
                    companyName: normalizedCompanyName
                }
            });

            if (employee) {
                // Find the User linked to this Employee
                user = await prisma.user.findFirst({
                    where: {
                        employeeId: employee.id, // Linked by DB ID, not custom ID
                        companyName: normalizedCompanyName
                    }
                });
            }
        }

        if (!user) {
            return { success: false, error: "User not found" };
        }

        // 3. Verify Password (bcrypt + backward-compatible plain text support)
        const ok = await verifyPassword(normalizedPassword, user.password);
        if (!ok) {
            await clearServerSession();
            return { success: false, error: "Invalid credentials" };
        }

        // Opportunistic migration: convert old plain-text passwords to bcrypt on successful login.
        if (!isHashedPassword(user.password)) {
            await prisma.user.update({
                where: { id: user.id },
                data: { password: await hashPassword(normalizedPassword) },
            });
        }

        await setServerSession({
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
            companyName: user.companyName,
        });

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
        await clearServerSession();
        return { success: false, error: "Login failed" };
    }
}
