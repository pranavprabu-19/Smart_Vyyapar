import crypto from "crypto";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/auth-context";

const SESSION_COOKIE = "smartvyapar_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SessionPayload = {
    id: string;
    email: string;
    role: UserRole;
    companyName?: string | null;
    exp: number;
};

function getSecret(): string {
    return process.env.AUTH_SESSION_SECRET || "dev_only_change_me_smartvyapar";
}

function b64url(input: string | Buffer): string {
    return Buffer.from(input).toString("base64url");
}

function sign(content: string): string {
    return b64url(
        crypto.createHmac("sha256", getSecret()).update(content).digest()
    );
}

function encode(payload: SessionPayload): string {
    const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = b64url(JSON.stringify(payload));
    const signature = sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
}

function decode(token: string): SessionPayload | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = sign(`${header}.${body}`);

    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expected);
    if (sigA.length !== sigB.length) return null;
    if (!crypto.timingSafeEqual(sigA, sigB)) return null;

    try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
        if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

export async function setServerSession(input: {
    id: string;
    email: string;
    role: UserRole;
    companyName?: string | null;
}) {
    const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const token = encode({
        id: input.id,
        email: input.email,
        role: input.role,
        companyName: input.companyName || null,
        exp,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    });
}

export async function clearServerSession() {
    const store = await cookies();
    store.set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
}

export async function getServerSession(): Promise<SessionPayload | null> {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return decode(token);
}
