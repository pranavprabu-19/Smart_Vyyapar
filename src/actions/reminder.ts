"use server";

import { prisma } from "@/lib/db";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-utils";
import { uploadFile } from "@/lib/storage";
import { sendWhatsAppInvoice } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface InvoiceForReminder {
  id: string;
  invoiceNo: string;
  date: Date;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  dueDate: Date;
  daysPastDue: number;
  isOverdue: boolean;
  customerName: string;
  customerId: string;
  customerPhone?: string | null;
  items: {
    description: string;
    quantity: number;
    price: number;
  }[];
}

export interface ReminderMessageData {
  customerName: string;
  invoiceNo: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  daysPastDue: number;
  items: { description: string; quantity: number; price: number }[];
  companyName: string;
  companyPhone?: string;
}

export interface CreateReminderTemplateData {
  companyName: string;
  name: string;
  type: "PAYMENT_DUE" | "FIRST_REMINDER" | "SECOND_REMINDER" | "FINAL_NOTICE";
  messageTemplate: string;
  triggerDays: number;
}

// ============================================
// INVOICE FETCHING FOR REMINDERS
// ============================================

/**
 * Get all unpaid invoices ready for reminder
 */
export async function getInvoicesForReminder(
  companyName: string,
  filters?: {
    minDaysPastDue?: number;
    maxDaysPastDue?: number;
    customerId?: string;
  }
) {
  try {
    const today = new Date();

    const whereClause: any = {
      companyName,
      status: "PENDING",
    };

    if (filters?.customerId) {
      whereClause.customerId = filters.customerId;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: {
          include: {
            credit: true,
          },
        },
        items: true,
      },
      orderBy: { date: "asc" },
    });

    const enrichedInvoices: InvoiceForReminder[] = invoices
      .filter((inv) => inv.customer) // Only include invoices with customers
      .map((inv) => {
        const creditDays = inv.customer?.credit?.creditDays || 30;
        const dueDate = inv.dueDate || new Date(inv.date.getTime() + creditDays * 24 * 60 * 60 * 1000);
        const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));
        const balance = Number(inv.totalAmount) - Number(inv.paidAmount);

        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          date: inv.date,
          totalAmount: Number(inv.totalAmount),
          paidAmount: Number(inv.paidAmount),
          balance,
          dueDate,
          daysPastDue,
          isOverdue: daysPastDue > 0,
          customerName: inv.customer!.name,
          customerId: inv.customer!.id,
          customerPhone: inv.customer!.phone,
          items: inv.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: Number(item.price),
          })),
        };
      })
      .filter((inv) => {
        // Apply day filters
        if (filters?.minDaysPastDue !== undefined && inv.daysPastDue < filters.minDaysPastDue) {
          return false;
        }
        if (filters?.maxDaysPastDue !== undefined && inv.daysPastDue > filters.maxDaysPastDue) {
          return false;
        }
        return true;
      });

    return { success: true, invoices: enrichedInvoices };
  } catch (error) {
    console.error("Failed to get invoices for reminder:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Get single invoice details for reminder
 */
export async function getInvoiceForReminder(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: {
          include: {
            credit: true,
          },
        },
        items: true,
      },
    });

    if (!invoice || !invoice.customer) {
      return { success: false, error: "Invoice or customer not found" };
    }

    const today = new Date();
    const creditDays = invoice.customer.credit?.creditDays || 30;
    const dueDate = invoice.dueDate || new Date(invoice.date.getTime() + creditDays * 24 * 60 * 60 * 1000);
    const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));

    const invoiceData: InvoiceForReminder = {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      date: invoice.date,
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      balance: Number(invoice.totalAmount) - Number(invoice.paidAmount),
      dueDate,
      daysPastDue,
      isOverdue: daysPastDue > 0,
      customerName: invoice.customer.name,
      customerId: invoice.customer.id,
      customerPhone: invoice.customer.phone,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price: Number(item.price),
      })),
    };

    return { success: true, invoice: invoiceData };
  } catch (error) {
    console.error("Failed to get invoice for reminder:", error);
    return { success: false, error: "Database Error" };
  }
}

// ============================================
// MESSAGE GENERATION
// ============================================

/**
 * Format currency in Indian format
 */
function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in readable format
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Generate reminder message for an invoice
 */
export async function generateReminderMessage(
  invoiceId: string,
  templateType: "PAYMENT_DUE" | "FIRST_REMINDER" | "SECOND_REMINDER" | "FINAL_NOTICE" = "FIRST_REMINDER"
): Promise<{ success: boolean; message?: string; data?: ReminderMessageData; error?: string }> {
  try {
    const result = await getInvoiceForReminder(invoiceId);
    if (!result.success || !result.invoice) {
      return { success: false, error: result.error || "Invoice not found" };
    }

    const invoice = result.invoice;

    // Get company details
    const dbInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    const company = await prisma.company.findFirst({
      where: { name: dbInvoice?.companyName },
    });

    // Build items list
    const itemsList = invoice.items
      .map((item) => `• ${item.description} (${item.quantity} × ${formatIndianCurrency(item.price)})`)
      .join("\n");

    // Prepare message data
    const messageData: ReminderMessageData = {
      customerName: invoice.customerName,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: formatDate(invoice.date),
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balance: invoice.balance,
      dueDate: formatDate(invoice.dueDate),
      daysPastDue: invoice.daysPastDue,
      items: invoice.items,
      companyName: dbInvoice?.companyName || "SmartVyapar",
      companyPhone: company?.phone || undefined,
    };

    // Generate message based on template type
    let message = "";
    const greeting = getGreeting();

    switch (templateType) {
      case "PAYMENT_DUE":
        message = `${greeting} ${invoice.customerName},

This is a friendly reminder that your payment is due today.

*Invoice Details:*
📄 Invoice No: ${invoice.invoiceNo}
📅 Invoice Date: ${formatDate(invoice.date)}
💰 Total Amount: ${formatIndianCurrency(invoice.totalAmount)}
✅ Paid: ${formatIndianCurrency(invoice.paidAmount)}
⏳ *Balance Due: ${formatIndianCurrency(invoice.balance)}*
📆 Due Date: ${formatDate(invoice.dueDate)}

*Items:*
${itemsList}

Please make the payment at your earliest convenience.

Thank you for your business!

Regards,
${messageData.companyName}${messageData.companyPhone ? `\n📞 ${messageData.companyPhone}` : ""}`;
        break;

      case "FIRST_REMINDER":
        message = `${greeting} ${invoice.customerName},

This is a gentle reminder regarding your pending payment.

*Invoice Details:*
📄 Invoice No: ${invoice.invoiceNo}
📅 Invoice Date: ${formatDate(invoice.date)}
💰 Total Amount: ${formatIndianCurrency(invoice.totalAmount)}
✅ Paid: ${formatIndianCurrency(invoice.paidAmount)}
⏳ *Balance Due: ${formatIndianCurrency(invoice.balance)}*
📆 Due Date: ${formatDate(invoice.dueDate)}
⚠️ Days Overdue: ${invoice.daysPastDue} days

*Items:*
${itemsList}

Kindly clear the dues at your earliest convenience.

For any queries, please reach out to us.

Regards,
${messageData.companyName}${messageData.companyPhone ? `\n📞 ${messageData.companyPhone}` : ""}`;
        break;

      case "SECOND_REMINDER":
        message = `${greeting} ${invoice.customerName},

This is a follow-up reminder for your overdue payment.

*Invoice Details:*
📄 Invoice No: ${invoice.invoiceNo}
💰 Total Amount: ${formatIndianCurrency(invoice.totalAmount)}
⏳ *Outstanding: ${formatIndianCurrency(invoice.balance)}*
⚠️ *${invoice.daysPastDue} days overdue*

*Items:*
${itemsList}

We request you to kindly settle this amount at the earliest to avoid any inconvenience.

If you have already made the payment, please share the details.

Regards,
${messageData.companyName}${messageData.companyPhone ? `\n📞 ${messageData.companyPhone}` : ""}`;
        break;

      case "FINAL_NOTICE":
        message = `Dear ${invoice.customerName},

⚠️ *URGENT: Final Payment Notice*

Despite our previous reminders, we have not received payment for the following:

📄 Invoice No: ${invoice.invoiceNo}
💰 *Amount Due: ${formatIndianCurrency(invoice.balance)}*
⚠️ *Overdue by ${invoice.daysPastDue} days*

*Items:*
${itemsList}

This is our final reminder before we are compelled to take further action.

Please make the payment immediately or contact us to discuss a payment arrangement.

Regards,
${messageData.companyName}${messageData.companyPhone ? `\n📞 ${messageData.companyPhone}` : ""}`;
        break;
    }

    return { success: true, message, data: messageData };
  } catch (error) {
    console.error("Failed to generate reminder message:", error);
    return { success: false, error: "Failed to generate message" };
  }
}

/**
 * Get appropriate greeting based on time of day
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ============================================
// REMINDER TRACKING
// ============================================

/**
 * Log a sent reminder
 */
export async function logReminder(data: {
  companyName: string;
  customerId: string;
  invoiceId?: string;
  dueAmount: number;
  dueDate: Date;
  daysPastDue: number;
  messageText: string;
  channel: "WHATSAPP" | "SMS" | "EMAIL";
  phoneNumber?: string;
  reminderType: "FIRST" | "SECOND" | "THIRD" | "FINAL";
}) {
  try {
    const company = await prisma.company.findFirst({ where: { name: data.companyName } });
    if (!company) throw new Error("Company not found");

    const reminder = await prisma.paymentReminder.create({
      data: {
        companyId: company.id,
        companyName: data.companyName,
        customerId: data.customerId,
        invoiceId: data.invoiceId,
        dueAmount: data.dueAmount,
        dueDate: data.dueDate,
        daysPastDue: data.daysPastDue,
        messageText: data.messageText,
        channel: data.channel,
        phoneNumber: data.phoneNumber,
        reminderType: data.reminderType,
        sentAt: new Date(),
        status: "SENT",
      },
    });

    revalidatePath("/dashboard/collections");

    return { success: true, reminder };
  } catch (error) {
    console.error("Failed to log reminder:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Send invoice reminder via WhatsApp API with invoice PDF attachment.
 * Falls back to text-only share on client if this fails.
 */
export async function sendReminderWithInvoicePdf(
  invoiceId: string,
  phone: string,
  templateType: "PAYMENT_DUE" | "FIRST_REMINDER" | "SECOND_REMINDER" | "FINAL_NOTICE" = "FIRST_REMINDER"
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!invoice || !invoice.customer) {
      return { success: false, error: "Invoice or customer not found" };
    }

    const messageRes = await generateReminderMessage(invoiceId, templateType);
    if (!messageRes.success || !messageRes.message) {
      return { success: false, error: messageRes.error || "Failed to generate reminder message" };
    }

    const invoiceData: InvoiceData = {
      companyName: invoice.companyName,
      invoiceNo: invoice.invoiceNo,
      date: invoice.date.toISOString().split("T")[0],
      time: invoice.date.toISOString().split("T")[1]?.slice(0, 5) || "00:00",
      placeOfSupply: invoice.customer.state || "Tamil Nadu",
      customer: {
        name: invoice.customer.name,
        address: invoice.customer.address || "",
        state: invoice.customer.state || "Tamil Nadu",
        gstin: invoice.customer.gstin || "",
        phone: invoice.customer.phone || undefined,
        email: invoice.customer.email || undefined,
        lat: invoice.customer.lat || undefined,
        lng: invoice.customer.lng || undefined,
      },
      paymentMode: (invoice.paymentMode as any) || "CREDIT",
      status: (invoice.status as any) || "PENDING",
      items: invoice.items.map((item) => ({
        id: item.productId,
        description: item.description,
        hsn: item.hsn || "",
        quantity: item.quantity,
        unit: "Nos",
        mrp: Number(item.price),
        price: Number(item.price),
        gstRate: Number(item.gstRate || 18),
      })),
    };

    const doc = await generateInvoicePDF(invoiceData);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const fileUrl = await uploadFile(pdfBuffer, `invoice-reminder-${invoice.invoiceNo}.pdf`);
    const publicBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const fullUrl = `${publicBase}${fileUrl}`;

    const waRes = await sendWhatsAppInvoice(
      phone,
      fullUrl,
      `Invoice_${invoice.invoiceNo}.pdf`,
      invoice.customer.name,
      invoice.companyName
    );

    if (!waRes.success) {
      return { success: false, error: "Failed to send WhatsApp document template" };
    }

    const dueDate = invoice.dueDate || invoice.date;
    const daysPastDue = Math.max(
      0,
      Math.floor((Date.now() - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000))
    );

    await logReminder({
      companyName: invoice.companyName,
      customerId: invoice.customer.id,
      invoiceId: invoice.id,
      dueAmount: Number(invoice.totalAmount) - Number(invoice.paidAmount),
      dueDate: new Date(dueDate),
      daysPastDue,
      messageText: messageRes.message,
      channel: "WHATSAPP",
      phoneNumber: phone,
      reminderType:
        templateType === "FINAL_NOTICE"
          ? "FINAL"
          : templateType === "SECOND_REMINDER"
            ? "SECOND"
            : "FIRST",
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send reminder with PDF:", error);
    return { success: false, error: error?.message || "Server error sending reminder PDF" };
  }
}

/**
 * Prepare reminder assets for manual WhatsApp share (no Meta API config needed).
 * Returns message text + public PDF URL so user can attach manually.
 */
export async function prepareReminderManualShare(
  invoiceId: string,
  phone: string,
  templateType: "PAYMENT_DUE" | "FIRST_REMINDER" | "SECOND_REMINDER" | "FINAL_NOTICE" = "FIRST_REMINDER"
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!invoice || !invoice.customer) {
      return { success: false, error: "Invoice or customer not found" };
    }

    const messageRes = await generateReminderMessage(invoiceId, templateType);
    if (!messageRes.success || !messageRes.message) {
      return { success: false, error: messageRes.error || "Failed to generate reminder message" };
    }

    const invoiceData: InvoiceData = {
      companyName: invoice.companyName,
      invoiceNo: invoice.invoiceNo,
      date: invoice.date.toISOString().split("T")[0],
      time: invoice.date.toISOString().split("T")[1]?.slice(0, 5) || "00:00",
      placeOfSupply: invoice.customer.state || "Tamil Nadu",
      customer: {
        name: invoice.customer.name,
        address: invoice.customer.address || "",
        state: invoice.customer.state || "Tamil Nadu",
        gstin: invoice.customer.gstin || "",
        phone: invoice.customer.phone || undefined,
        email: invoice.customer.email || undefined,
        lat: invoice.customer.lat || undefined,
        lng: invoice.customer.lng || undefined,
      },
      paymentMode: (invoice.paymentMode as any) || "CREDIT",
      status: (invoice.status as any) || "PENDING",
      items: invoice.items.map((item) => ({
        id: item.productId,
        description: item.description,
        hsn: item.hsn || "",
        quantity: item.quantity,
        unit: "Nos",
        mrp: Number(item.price),
        price: Number(item.price),
        gstRate: Number(item.gstRate || 18),
      })),
    };

    const doc = await generateInvoicePDF(invoiceData);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const fileUrl = await uploadFile(pdfBuffer, `invoice-reminder-${invoice.invoiceNo}.pdf`);
    const publicBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const fullUrl = `${publicBase}${fileUrl}`;

    const dueDate = invoice.dueDate || invoice.date;
    const daysPastDue = Math.max(
      0,
      Math.floor((Date.now() - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000))
    );

    await logReminder({
      companyName: invoice.companyName,
      customerId: invoice.customer.id,
      invoiceId: invoice.id,
      dueAmount: Number(invoice.totalAmount) - Number(invoice.paidAmount),
      dueDate: new Date(dueDate),
      daysPastDue,
      messageText: messageRes.message,
      channel: "WHATSAPP",
      phoneNumber: phone,
      reminderType:
        templateType === "FINAL_NOTICE"
          ? "FINAL"
          : templateType === "SECOND_REMINDER"
            ? "SECOND"
            : "FIRST",
    });

    return {
      success: true,
      message: messageRes.message,
      pdfUrl: fullUrl,
    };
  } catch (error: any) {
    console.error("Failed to prepare manual reminder share:", error);
    return { success: false, error: error?.message || "Failed to prepare reminder assets" };
  }
}

/**
 * Prepare reminder for the latest pending invoice of a customer.
 * Used by Customer Directory "Remind" buttons (no Meta config).
 */
export async function prepareLatestInvoiceReminderManualShare(input: {
  companyName: string;
  customerId: string;
  phone: string;
  templateType?: "PAYMENT_DUE" | "FIRST_REMINDER" | "SECOND_REMINDER" | "FINAL_NOTICE";
}) {
  try {
    const latestInvoice = await prisma.invoice.findFirst({
      where: {
        companyName: input.companyName,
        customerId: input.customerId,
        status: { in: ["PENDING", "GENERATED", "PRINTED", "DISPATCHED", "DELIVERED"] },
      },
      orderBy: { date: "desc" },
      select: { id: true },
    });

    if (!latestInvoice) {
      return { success: false, error: "No pending invoice found for this customer" };
    }

    return prepareReminderManualShare(
      latestInvoice.id,
      input.phone,
      input.templateType || "FIRST_REMINDER"
    );
  } catch (error: any) {
    console.error("Failed to prepare latest invoice reminder:", error);
    return { success: false, error: error?.message || "Failed to prepare latest invoice reminder" };
  }
}

/**
 * Get reminder history for a customer
 */
export async function getReminderHistory(customerId: string) {
  try {
    const reminders = await prisma.paymentReminder.findMany({
      where: { customerId },
      include: {
        invoice: {
          select: {
            invoiceNo: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, reminders };
  } catch (error) {
    console.error("Failed to get reminder history:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Get reminder history for an invoice
 */
export async function getInvoiceReminderHistory(invoiceId: string) {
  try {
    const reminders = await prisma.paymentReminder.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, reminders };
  } catch (error) {
    console.error("Failed to get invoice reminder history:", error);
    return { success: false, error: "Database Error" };
  }
}

// ============================================
// REMINDER TEMPLATES
// ============================================

/**
 * Create a custom reminder template
 */
export async function createReminderTemplate(data: CreateReminderTemplateData) {
  try {
    const company = await prisma.company.findFirst({ where: { name: data.companyName } });
    if (!company) throw new Error("Company not found");

    const template = await prisma.reminderTemplate.create({
      data: {
        companyId: company.id,
        companyName: data.companyName,
        name: data.name,
        type: data.type,
        messageTemplate: data.messageTemplate,
        triggerDays: data.triggerDays,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/settings/reminders");

    return { success: true, template };
  } catch (error) {
    console.error("Failed to create reminder template:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Get all reminder templates for a company
 */
export async function getReminderTemplates(companyName: string) {
  try {
    const templates = await prisma.reminderTemplate.findMany({
      where: { companyName },
      orderBy: { triggerDays: "asc" },
    });

    return { success: true, templates };
  } catch (error) {
    console.error("Failed to get reminder templates:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Update a reminder template
 */
export async function updateReminderTemplate(
  templateId: string,
  data: Partial<CreateReminderTemplateData>
) {
  try {
    const template = await prisma.reminderTemplate.update({
      where: { id: templateId },
      data,
    });

    revalidatePath("/dashboard/settings/reminders");

    return { success: true, template };
  } catch (error) {
    console.error("Failed to update reminder template:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Delete a reminder template
 */
export async function deleteReminderTemplate(templateId: string) {
  try {
    await prisma.reminderTemplate.delete({
      where: { id: templateId },
    });

    revalidatePath("/dashboard/settings/reminders");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete reminder template:", error);
    return { success: false, error: "Database Error" };
  }
}

// ============================================
// BULK REMINDER OPERATIONS
// ============================================

/**
 * Get summary of customers needing reminders
 */
export async function getReminderSummary(companyName: string) {
  try {
    const result = await getInvoicesForReminder(companyName);
    if (!result.success || !result.invoices) {
      return { success: false, error: result.error };
    }

    const invoices = result.invoices;

    // Group by overdue buckets
    const summary = {
      dueToday: invoices.filter((i) => i.daysPastDue === 0).length,
      overdue1to7: invoices.filter((i) => i.daysPastDue >= 1 && i.daysPastDue <= 7).length,
      overdue8to15: invoices.filter((i) => i.daysPastDue >= 8 && i.daysPastDue <= 15).length,
      overdue16to30: invoices.filter((i) => i.daysPastDue >= 16 && i.daysPastDue <= 30).length,
      overdue30plus: invoices.filter((i) => i.daysPastDue > 30).length,
      totalPending: invoices.length,
      totalAmount: invoices.reduce((sum, i) => sum + i.balance, 0),
    };

    return { success: true, summary };
  } catch (error) {
    console.error("Failed to get reminder summary:", error);
    return { success: false, error: "Database Error" };
  }
}
