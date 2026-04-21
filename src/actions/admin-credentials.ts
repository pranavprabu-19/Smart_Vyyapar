"use server";

import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/server-session";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";

function generatePassword(len = 12): string {
    return crypto.randomBytes(len).toString("base64url").slice(0, len);
}

export async function rotateAdminPasswordAction(input?: { targetEmail?: string; newPassword?: string }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return { success: false, error: "Unauthorized session." };
        }
        if (session.role !== "ADMIN") {
            return { success: false, error: "Only ADMIN users can rotate admin credentials." };
        }

        const targetEmail = (input?.targetEmail || session.email).trim().toLowerCase();
        const resolvedPassword = (input?.newPassword || "").trim() || generatePassword(12);
        const policy = validatePasswordPolicy(resolvedPassword);
        if (!policy.valid) {
            return { success: false, error: policy.error };
        }

        const user = await prisma.user.findUnique({
            where: { email: targetEmail },
            select: { id: true, role: true, email: true, companyName: true },
        });
        if (!user) {
            return { success: false, error: "Target user not found." };
        }
        if (user.role !== "ADMIN") {
            return { success: false, error: "Target user is not an ADMIN account." };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { password: await hashPassword(resolvedPassword) },
        });

        return {
            success: true,
            credentials: {
                email: user.email,
                password: resolvedPassword,
                companyName: user.companyName || null,
            },
        };
    } catch (error) {
        console.error("rotateAdminPasswordAction failed:", error);
        return { success: false, error: "Failed to rotate admin password." };
    }
}

