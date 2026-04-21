"use server";

import crypto from "crypto";
import { prisma } from "@/lib/db";
import { assertAdminAccess } from "@/lib/access-guards";
import { getServerSession } from "@/lib/server-session";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";

function randomPassword(length = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    let out = "";
    for (let i = 0; i < length; i += 1) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

export async function inviteCAAction(input: {
    companyName: string;
    caName: string;
    caEmail: string;
    inviteValidityHours?: number;
}) {
    try {
        const session = await getServerSession();
        if (!session) return { success: false, error: "Unauthorized session." };
        assertAdminAccess(session.role);
        if (session.companyName && session.companyName !== input.companyName) {
            return { success: false, error: "Forbidden company scope." };
        }

        const company = await prisma.company.findUnique({
            where: { name: input.companyName },
            select: { name: true },
        });
        if (!company) return { success: false, error: "Company not found." };

        const existing = await prisma.user.findUnique({
            where: { email: input.caEmail },
        });

        const temporaryPassword = randomPassword(14);
        const temporaryPasswordHash = await hashPassword(temporaryPassword);
        if (existing) {
            await prisma.user.update({
                where: { email: input.caEmail },
                data: {
                    name: input.caName,
                    role: "CA",
                    companyName: input.companyName,
                    password: temporaryPasswordHash,
                },
            });
        } else {
            await prisma.user.create({
                data: {
                    email: input.caEmail,
                    name: input.caName,
                    role: "CA",
                    companyName: input.companyName,
                    password: temporaryPasswordHash,
                },
            });
        }

        const token = crypto.randomBytes(24).toString("hex");
        const expiryHours = Math.max(1, input.inviteValidityHours ?? 72);
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        await prisma.$executeRaw`
            INSERT INTO CAInviteToken (id, email, companyName, token, expiresAt, createdAt)
            VALUES (
                ${`cainvite_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
                ${input.caEmail},
                ${input.companyName},
                ${token},
                ${expiresAt.toISOString()},
                ${new Date().toISOString()}
            )
        `;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const inviteLink = `${appUrl}/ca-portal/activate?token=${token}`;

        // Email provider wiring can be added later; this link can be sent manually for now.
        console.log("[CA INVITE] Send this activation link to CA:", inviteLink);

        try {
            await prisma.$executeRaw`
                INSERT INTO CAAuditLog (id, companyName, caUserEmail, action, details, createdAt)
                VALUES (
                    ${`calog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
                    ${input.companyName},
                    ${input.caEmail},
                    ${"INVITE_CA"},
                    ${`Invite generated. Expires at ${expiresAt.toISOString()}`},
                    ${new Date().toISOString()}
                )
            `;
        } catch {
            // Ignore if migration not applied yet.
        }

        return {
            success: true,
            inviteLink,
            expiresAt: expiresAt.toISOString(),
            message: "CA invite created successfully.",
        };
    } catch (e: any) {
        return { success: false, error: e?.message || "Failed to invite CA." };
    }
}

export async function activateCAInviteAction(input: {
    token: string;
    newPassword: string;
}) {
    try {
        if (!input.newPassword || input.newPassword.length < 8) {
            return { success: false, error: "Password must be at least 10 characters." };
        }
        const policy = validatePasswordPolicy(input.newPassword);
        if (!policy.valid) {
            return { success: false, error: policy.error };
        }

        const rows = await prisma.$queryRaw<Array<any>>`
            SELECT id, email, companyName, token, expiresAt, usedAt
            FROM CAInviteToken
            WHERE token = ${input.token}
            LIMIT 1
        `;
        const invite = rows[0];
        if (!invite) return { success: false, error: "Invalid invite token." };
        if (invite.usedAt) return { success: false, error: "Invite token already used." };
        if (new Date(invite.expiresAt).getTime() < Date.now()) {
            return { success: false, error: "Invite token expired." };
        }

        await prisma.user.update({
            where: { email: invite.email },
            data: { password: await hashPassword(input.newPassword), role: "CA", companyName: invite.companyName },
        });

        await prisma.$executeRaw`
            UPDATE CAInviteToken
            SET usedAt = ${new Date().toISOString()}
            WHERE token = ${input.token}
        `;

        return { success: true, message: "CA account activated." };
    } catch (e: any) {
        return { success: false, error: e?.message || "Failed to activate invite." };
    }
}
