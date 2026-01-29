"use server";

import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-utils";
import { uploadFile } from "@/lib/storage";
import { sendWhatsAppInvoice } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";

export async function sendInvoiceWhatsAppAction(invoiceData: InvoiceData, phone: string) {
    try {
        console.log("Starting WhatsApp Invoice Send Flow...");

        // 1. Generate PDF on Server
        // We pass null for imageLoader if we want strictly server side, or handle images gracefully
        const doc = await generateInvoicePDF(invoiceData);
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
        const result = await sendWhatsAppInvoice(phone, fullUrl, `Invoice_${invoiceData.invoiceNo}.pdf`, invoiceData.customer.name);

        if (result.success) {
            return { success: true, message: "Invoice sent via WhatsApp!" };
        } else {
            return { success: false, message: "Failed to send WhatsApp message." };
        }

    } catch (error) {
        console.error("WhatsApp Send Error:", error);
        return { success: false, message: "Server error sending WhatsApp.", error: String(error) };
    }
}
