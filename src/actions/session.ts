"use server";

import { clearServerSession, getServerSession } from "@/lib/server-session";

export async function logoutServerAction() {
    await clearServerSession();
    return { success: true };
}

export async function getCurrentServerSessionAction() {
    const session = await getServerSession();
    if (!session) {
        return { success: false as const, session: null };
    }
    return {
        success: true as const,
        session: {
            id: session.id,
            email: session.email,
            role: session.role,
            companyName: session.companyName || null,
            exp: session.exp,
        },
    };
}
