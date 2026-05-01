"use server";

import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-utils";
import { uploadFile } from "@/lib/storage";
import { sendWhatsAppInvoice } from "@/lib/whatsapp";
import { prisma } from "@/lib/db";

function customerFromDbInvoice(invoice: {
    customerName: string;
    billingAddress: string;
    customerDetails: any;
    customer: {
        name: string;
        address: string | null;
        state: string | null;
        gstin: string | null;
        phone: string | null;
        email: string | null;
        lat: number | null;
        lng: number | null;
    } | null;
}): InvoiceData["customer"] {
    if (invoice.customer) {
        return {
            name: invoice.customer.name,
            address: invoice.customer.address || "",
            state: invoice.customer.state || "Tamil Nadu",
            gstin: invoice.customer.gstin || "",
            phone: invoice.customer.phone || undefined,
            email: invoice.customer.email || undefined,
            lat: invoice.customer.lat ?? undefined,
            lng: invoice.customer.lng ?? undefined,
        };
    }
    try {
        const parsed = (typeof invoice.customerDetails === 'string' ? JSON.parse(invoice.customerDetails) : invoice.customerDetails) as Partial<InvoiceData["customer"]>;
        return {
            name: parsed.name || invoice.customerName,
            address: parsed.address || invoice.billingAddress || "",
            state: parsed.state || "Tamil Nadu",
            gstin: parsed.gstin || "",
            phone: parsed.phone,
            email: parsed.email,
            lat: parsed.lat,
            lng: parsed.lng,
        };
    } catch {
        return {
            name: invoice.customerName,
            address: invoice.billingAddress || "",
            state: "Tamil Nadu",
            gstin: "",
        };
    }
}

function invoiceDbRowToInvoiceData(
    invoice: {
        companyName: string;
        invoiceNo: string;
        date: Date;
        paymentMode: string;
        status: string;
        items: Array<{
            productId: string;
            description: string;
            hsn: string | null;
            quantity: number;
            price: any;
            costPrice: any;
            gstRate: any;
        }>;
    } & Parameters<typeof customerFromDbInvoice>[0]
): InvoiceData {
    const customer = customerFromDbInvoice(invoice);
    return {
        companyName: invoice.companyName,
        invoiceNo: invoice.invoiceNo,
        date: invoice.date.toISOString().split("T")[0],
        time: invoice.date.toISOString().split("T")[1]?.slice(0, 5) || "00:00",
        placeOfSupply: customer.state || "Tamil Nadu",
        customer,
        paymentMode: (invoice.paymentMode as InvoiceData["paymentMode"]) || "CREDIT",
        status: (invoice.status as InvoiceData["status"]) || "PENDING",
        items: invoice.items.map((item) => ({
            id: item.productId,
            description: item.description,
            hsn: item.hsn || "",
            quantity: item.quantity,
            unit: "Nos",
            mrp: Number(item.price),
            price: Number(item.price),
            costPrice: Number(item.costPrice),
            gstRate: Number(item.gstRate || 18),
        })),
    };
}

function normalizeInvoiceForPdf(inv: InvoiceData & { totalAmount?: number }): InvoiceData {
    return {
        ...inv,
        items: inv.items.map((it, i) => ({
            id: it.id ?? i,
            description: it.description,
            hsn: it.hsn ?? "",
            quantity: it.quantity,
            unit: it.unit ?? "Nos",
            mrp: it.mrp ?? it.price,
            price: it.price,
            costPrice: it.costPrice,
            gstRate: it.gstRate ?? 18,
        })),
    };
}

/**
 * Manual WhatsApp flow (no Meta API): generate PDF, upload, return text + URL.
 * Client opens WhatsApp (wa.me) and PDF tab so admin can attach the file.
 */
export async function prepareInvoiceManualWhatsAppAction(
    invoiceData: InvoiceData & { totalAmount?: number },
    phone: string
): Promise<{ success: boolean; message?: string; pdfUrl?: string; error?: string }> {
    try {
        const normalized = normalizeInvoiceForPdf(invoiceData);
        const doc = await generateInvoicePDF(normalized);
        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
        const fileUrl = await uploadFile(pdfBuffer, `invoice-${invoiceData.invoiceNo}.pdf`);
        const publicBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const fullUrl = `${publicBase}${fileUrl}`;

        const amt =
            invoiceData.totalAmount ??
            invoiceData.items.reduce((s, it) => s + it.quantity * it.price, 0);

        const message = `Dear ${invoiceData.customer.name},

Invoice *${invoiceData.invoiceNo}*
Amount: ₹${typeof amt === "number" ? amt.toLocaleString("en-IN") : amt}

PDF (attach this in WhatsApp): ${fullUrl}

– ${invoiceData.companyName}`;

        return { success: true, message, pdfUrl: fullUrl };
    } catch (error) {
        console.error("prepareInvoiceManualWhatsAppAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to prepare invoice PDF" };
    }
}

/**
 * Same as manual WhatsApp prep, but loads the invoice from the database by id + company
 * so the PDF and amounts always match persisted data for that customer/invoice.
 */
export async function prepareInvoiceManualWhatsAppFromDbAction(input: {
    invoiceId: string;
    companyName: string;
    phone: string;
}): Promise<{ success: boolean; message?: string; pdfUrl?: string; error?: string }> {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: input.invoiceId, companyName: input.companyName },
            include: { customer: true, items: true },
        });

        if (!invoice) {
            return { success: false, error: "Invoice not found for this company" };
        }

        const invoiceData = invoiceDbRowToInvoiceData(invoice);
        const normalized = normalizeInvoiceForPdf({ ...invoiceData, totalAmount: Number(invoice.totalAmount) });
        const doc = await generateInvoicePDF(normalized);
        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
        const deterministicName = `invoice-${invoice.id}-${invoice.invoiceNo}`;
        const fileUrl = await uploadFile(pdfBuffer, `${deterministicName}.pdf`, {
            deterministicName,
        });
        const publicBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const fullUrl = `${publicBase}${fileUrl}`;

        const customerName = invoiceData.customer.name;
        const amt = Number(invoice.totalAmount).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        const message = `Dear ${customerName},

Your invoice *${invoice.invoiceNo}* for ₹${amt} is ready.

This PDF was generated for this bill from our records — attach it in WhatsApp:
${fullUrl}

– ${invoice.companyName}`;

        return { success: true, message, pdfUrl: fullUrl };
    } catch (error) {
        console.error("prepareInvoiceManualWhatsAppFromDbAction:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to prepare invoice PDF from database",
        };
    }
}

/** Optional Meta API path — requires Communication Settings credentials. */
export async function sendInvoiceWhatsAppAction(invoiceData: InvoiceData, phone: string) {
    try {
        console.log("Starting WhatsApp Invoice Send Flow...");

        // 1. Generate PDF on Server
        // We pass null for imageLoader if we want strictly server side, or handle images gracefully
        const doc = await generateInvoicePDF(normalizeInvoiceForPdf(invoiceData as InvoiceData & { totalAmount?: number }));
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        console.log("PDF Generated. Size:", pdfBuffer.length);

        // 2. Upload to "Cloud" (Local Storage)
        // If running locally, we need to construct a full URL if WhatsApp API needs to reach it.
        // For local dev, localhost URLs won't be reachable by real WhatsApp API.
        // But for our simulation/logging, the relative path is fine or we assume ngrok.
        const fileUrl = await uploadFile(pdfBuffer, `invoice-${invoiceData.invoiceNo}.pdf`);

        // Construct full URL for logging clarity
        const fullUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}${fileUrl}`
            : `http://localhost:3000${fileUrl}`;

        console.log("File Uploaded:", fullUrl);

        // 3. Send via WhatsApp API
        const result = await sendWhatsAppInvoice(
            phone,
            fullUrl,
            `Invoice_${invoiceData.invoiceNo}.pdf`,
            invoiceData.customer.name,
            invoiceData.companyName
        );

        if (result.success) {
            return { success: true, message: "Invoice sent via WhatsApp!" };
        } else {
            return { success: false, message: result.error || "Failed to send WhatsApp message." };
        }

    } catch (error) {
        console.error("WhatsApp Send Error:", error);
        return { success: false, message: "Server error sending WhatsApp.", error: String(error) };
    }
}
