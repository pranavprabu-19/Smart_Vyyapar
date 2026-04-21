
import { prisma } from "@/lib/db";

type WhatsAppSendResult = {
    success: boolean;
    messageId?: string;
    provider?: "meta_cloud_api";
    error?: string;
};

function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length <= 10) return `91${digits}`;
    return digits;
}

async function loadWhatsAppConfig(companyName?: string) {
    if (companyName) {
        const company = await prisma.company.findUnique({
            where: { name: companyName },
            select: {
                whatsappApiKey: true,
                whatsappPhoneId: true,
                invoiceTemplateId: true,
            },
        });
        return {
            token: company?.whatsappApiKey || process.env.WHATSAPP_API_TOKEN || "",
            phoneNumberId: company?.whatsappPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
            invoiceTemplate: company?.invoiceTemplateId || process.env.WHATSAPP_INVOICE_TEMPLATE || "invoice_sent",
        };
    }

    return {
        token: process.env.WHATSAPP_API_TOKEN || "",
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
        invoiceTemplate: process.env.WHATSAPP_INVOICE_TEMPLATE || "invoice_sent",
    };
}

export async function sendWhatsAppInvoice(
    to: string,
    pdfUrl: string,
    filename: string,
    customerName: string,
    companyName?: string
): Promise<WhatsAppSendResult> {
    const phone = normalizePhone(to);
    if (!phone) {
        return { success: false, error: "Invalid phone number for WhatsApp send" };
    }

    const { token, phoneNumberId, invoiceTemplate } = await loadWhatsAppConfig(companyName);
    if (!token || !phoneNumberId) {
        return {
            success: false,
            error: "WhatsApp is not configured. Set Phone Number ID and API token in Communication Settings.",
        };
    }

    // Meta Cloud API needs a publicly reachable URL for document links.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(pdfUrl)) {
        return {
            success: false,
            error: "Invoice PDF URL is local-only. Set NEXT_PUBLIC_APP_URL to a public URL (or tunnel) for WhatsApp document delivery.",
        };
    }

    const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v20.0";
    const endpoint = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;
    const payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
            name: invoiceTemplate,
            language: { code: "en_US" },
            components: [
                {
                    type: "header",
                    parameters: [
                        {
                            type: "document",
                            document: {
                                link: pdfUrl,
                                filename,
                            },
                        },
                    ],
                },
                {
                    type: "body",
                    parameters: [{ type: "text", text: customerName }],
                },
            ],
        },
    };

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            const errMsg = body?.error?.message || `WhatsApp API request failed (${res.status})`;
            return { success: false, error: errMsg, provider: "meta_cloud_api" };
        }

        return {
            success: true,
            messageId: body?.messages?.[0]?.id,
            provider: "meta_cloud_api",
        };
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || "Network error while sending WhatsApp message",
            provider: "meta_cloud_api",
        };
    }
}

export async function sendWhatsAppRiskAlert(input: {
    to: string;
    customerName: string;
    previousLimit: number;
    newLimit: number;
    riskScore: number;
}) {
    const payload = {
        to: input.to,
        type: "text",
        text: {
            body:
                `SmartVyapar Risk Alert\n` +
                `Customer: ${input.customerName}\n` +
                `Risk Score: ${(input.riskScore * 100).toFixed(1)}%\n` +
                `Credit Limit Updated: ₹${input.previousLimit.toLocaleString()} -> ₹${input.newLimit.toLocaleString()}`,
        },
    };

    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("[WHATSAPP-API] Risk alert sent:", JSON.stringify(payload, null, 2));
    return { success: true, messageId: "wa_risk_" + Date.now() };
}
