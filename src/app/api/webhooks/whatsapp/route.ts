import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

type WhatsAppWebhookBody = {
    object?: string;
    entry?: Array<{
        id?: string;
        changes?: Array<{
            field?: string;
            value?: {
                messaging_product?: string;
                metadata?: {
                    display_phone_number?: string;
                    phone_number_id?: string;
                };
                contacts?: Array<{
                    wa_id?: string;
                    profile?: { name?: string };
                }>;
                messages?: Array<{
                    id?: string;
                    from?: string;
                    timestamp?: string;
                    type?: string;
                    text?: { body?: string };
                }>;
                statuses?: Array<{
                    id?: string;
                    status?: string;
                    recipient_id?: string;
                    timestamp?: string;
                    errors?: Array<{ title?: string; code?: number; details?: string }>;
                }>;
            };
        }>;
    }>;
};

function normalizePhone(raw?: string): string {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length <= 10) return `91${digits}`;
    return digits;
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) return true; // Optional in dev; if set, enforce verification.
    if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
    const given = signatureHeader.substring("sha256=".length);
    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    } catch {
        return false;
    }
}

async function updateLatestReminderForRecipient(recipientRaw: string | undefined, status: string, errorMessage?: string) {
    const normalized = normalizePhone(recipientRaw);
    if (!normalized) return;
    const last10 = normalized.slice(-10);

    const latest = await prisma.paymentReminder.findFirst({
        where: {
            channel: "WHATSAPP",
            OR: [
                { phoneNumber: normalized },
                { phoneNumber: { endsWith: last10 } },
            ],
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
    });
    if (!latest) return;

    await prisma.paymentReminder.update({
        where: { id: latest.id },
        data: {
            status,
            deliveredAt: status === "DELIVERED" || status === "READ" || status === "REPLIED" ? new Date() : undefined,
            errorMessage: errorMessage || undefined,
        },
    });
}

/**
 * Meta webhook verification:
 * GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 */
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
        return new NextResponse(challenge || "", { status: 200 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * Receives incoming WhatsApp events from Meta Cloud API.
 * Currently logs normalized inbound text messages.
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");
        if (!verifyMetaSignature(rawBody, signature)) {
            return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
        }

        const body = JSON.parse(rawBody) as WhatsAppWebhookBody;

        const entries = body.entry || [];
        for (const entry of entries) {
            for (const change of entry.changes || []) {
                if (change.field !== "messages") continue;

                const value = change.value;
                const phoneNumberId = value?.metadata?.phone_number_id;
                const messages = value?.messages || [];
                const statuses = value?.statuses || [];

                for (const msg of messages) {
                    const text = msg.text?.body || "";
                    console.log("[WHATSAPP-WEBHOOK] inbound_text", {
                        phoneNumberId,
                        from: msg.from,
                        messageId: msg.id,
                        timestamp: msg.timestamp,
                        text,
                        type: msg.type,
                    });

                    // Customer replied in DM; mark latest reminder as REPLIED for callback workflows.
                    await updateLatestReminderForRecipient(msg.from, "REPLIED");
                }

                for (const statusEvent of statuses) {
                    const recipient = statusEvent.recipient_id;
                    const providerStatus = statusEvent.status || "unknown";
                    const mappedStatus =
                        providerStatus === "delivered"
                            ? "DELIVERED"
                            : providerStatus === "read"
                                ? "READ"
                                : providerStatus === "sent"
                                    ? "SENT"
                                    : providerStatus === "failed"
                                        ? "FAILED"
                                        : "PENDING";
                    const firstError = statusEvent.errors?.[0];
                    const errorText =
                        firstError?.details || firstError?.title || (mappedStatus === "FAILED" ? "WhatsApp delivery failed" : undefined);

                    console.log("[WHATSAPP-WEBHOOK] outbound_status", {
                        phoneNumberId,
                        recipient,
                        status: providerStatus,
                        messageId: statusEvent.id,
                        timestamp: statusEvent.timestamp,
                        error: errorText,
                    });

                    await updateLatestReminderForRecipient(recipient, mappedStatus, errorText);
                }
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error: any) {
        console.error("[WHATSAPP-WEBHOOK] parse_error", error?.message || String(error));
        return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }
}

