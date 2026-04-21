"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { syncCustomerCreditFromBalance } from "@/lib/customerCredit";

// ============================================
// TYPES
// ============================================

export interface SetCustomerCreditData {
  customerId: string;
  creditLimit: number;
  creditDays?: number;
  tier?: "A" | "B" | "C";
}

export interface RecordPaymentData {
  companyName: string;
  customerId: string;
  invoiceId?: string;
  amount: number;
  mode: "CASH" | "CHEQUE" | "UPI" | "BANK_TRANSFER" | "NEFT" | "RTGS";
  reference?: string;
  chequeNo?: string;
  chequeDate?: Date;
  bankName?: string;
  collectedBy?: string;
  notes?: string;
}

export interface CustomerOutstanding {
  customerId: string;
  customerName: string;
  phone?: string | null;
  totalOutstanding: number;
  creditLimit: number;
  availableCredit: number;
  creditDays: number;
  tier: string;
  isBlocked: boolean;
  lastPaymentDate?: Date | null;
  overdueInvoices: {
    id: string;
    invoiceNo: string;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    date: Date;
    dueDate?: Date | null;
    daysPastDue: number;
  }[];
}

// ============================================
// CREDIT MANAGEMENT ACTIONS
// ============================================

/**
 * Set or update customer credit terms
 */
export async function setCustomerCredit(data: SetCustomerCreditData) {
  try {
    const { customerId, creditLimit, creditDays = 30, tier = "C" } = data;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const canonicalOutstanding = Number(customer.balance || 0);
    const derivedAvailable = Number((creditLimit - canonicalOutstanding).toFixed(2));

    // Upsert customer credit record using customer.balance as canonical dues
    const credit = await prisma.customerCredit.upsert({
      where: { customerId },
      update: {
        creditLimit,
        creditDays,
        tier,
        currentBalance: canonicalOutstanding,
        availableCredit: derivedAvailable,
      },
      create: {
        customerId,
        creditLimit,
        creditDays,
        tier,
        currentBalance: canonicalOutstanding,
        availableCredit: derivedAvailable,
      },
    });

    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath("/dashboard/collections");

    return { success: true, credit };
  } catch (error) {
    console.error("Failed to set customer credit:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Get customer credit details with outstanding
 */
export async function getCustomerCredit(customerId: string) {
  try {
    const credit = await prisma.customerCredit.findUnique({
      where: { customerId },
      include: {
        customer: true,
      },
    });

    if (!credit) {
      // Return default values if no credit record exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      
      return {
        success: true,
        credit: {
          customerId,
          customerName: customer?.name || "",
          creditLimit: 0,
          currentBalance: 0,
          availableCredit: 0,
          creditDays: 30,
          tier: "C",
          isBlocked: false,
        },
      };
    }

    return { success: true, credit };
  } catch (error) {
    console.error("Failed to get customer credit:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Get complete outstanding details for a customer
 */
export async function getCustomerOutstanding(customerId: string): Promise<{
  success: boolean;
  outstanding?: CustomerOutstanding;
  error?: string;
}> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        credit: true,
        invoices: {
          where: {
            status: "PENDING",
          },
          orderBy: { date: "asc" },
        },
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const today = new Date();
    const overdueInvoices = customer.invoices.map((inv) => {
      const dueDate = inv.dueDate || new Date(inv.date.getTime() + (customer.credit?.creditDays || 30) * 24 * 60 * 60 * 1000);
      const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));
      
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        balance: inv.totalAmount - inv.paidAmount,
        date: inv.date,
        dueDate: inv.dueDate,
        daysPastDue,
      };
    });

    // Canonical dues value is customer.balance.
    const totalOutstanding = Number(customer.balance || 0);

    const outstanding: CustomerOutstanding = {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      totalOutstanding,
      creditLimit: customer.credit?.creditLimit || 0,
      availableCredit: Number(((customer.credit?.creditLimit || 0) - totalOutstanding).toFixed(2)),
      creditDays: customer.credit?.creditDays || 30,
      tier: customer.credit?.tier || "C",
      isBlocked: customer.credit?.isBlocked || false,
      lastPaymentDate: customer.credit?.lastPaymentDate,
      overdueInvoices,
    };

    return { success: true, outstanding };
  } catch (error) {
    console.error("Failed to get customer outstanding:", error);
    return { success: false, error: "Database Error" };
  }
}

// ============================================
// PAYMENT ACTIONS
// ============================================

/**
 * Generate unique payment number
 */
async function generatePaymentNo(companyName: string): Promise<string> {
  const count = await prisma.payment.count({
    where: { companyName },
  });
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `PAY-${year}${month}-${(count + 1).toString().padStart(4, "0")}`;
}

/**
 * Record a payment from customer
 */
export async function recordPayment(data: RecordPaymentData) {
  try {
    const paymentNo = await generatePaymentNo(data.companyName);
    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          companyName: data.companyName,
          paymentNo,
          customerId: data.customerId,
          invoiceId: data.invoiceId,
          amount: data.amount,
          mode: data.mode,
          reference: data.reference,
          chequeNo: data.chequeNo,
          chequeDate: data.chequeDate,
          bankName: data.bankName,
          collectedBy: data.collectedBy,
          notes: data.notes,
          status: data.mode === "CHEQUE" ? "RECEIVED" : "CLEARED",
        },
      });

      if (data.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: data.invoiceId },
        });

        if (invoice) {
          const newPaidAmount = invoice.paidAmount + data.amount;
          const newStatus = newPaidAmount >= invoice.totalAmount ? "PAID" : "PENDING";

          await tx.invoice.update({
            where: { id: data.invoiceId },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus,
            },
          });
        }
      }

      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          balance: { decrement: data.amount },
        },
      });

      await syncCustomerCreditFromBalance({
        customerId: data.customerId,
        tx,
        overrides: {
          lastPaymentDate: new Date(),
          lastPaymentAmount: data.amount,
        },
      });

      return createdPayment;
    });

    revalidatePath("/dashboard/collections");
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${data.customerId}`);
    revalidatePath("/dashboard/invoices");

    return { success: true, payment };
  } catch (error) {
    console.error("Failed to record payment:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Get payment history for a customer
 */
export async function getCustomerPayments(customerId: string) {
  try {
    const payments = await prisma.payment.findMany({
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

    return { success: true, payments };
  } catch (error) {
    console.error("Failed to get customer payments:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Update cheque status (for PDC management)
 */
export async function updateChequeStatus(
  paymentId: string,
  status: "DEPOSITED" | "CLEARED" | "BOUNCED"
) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      // If cheque bounced, reverse the payment effects
      if (status === "BOUNCED") {
        if (payment.invoiceId) {
          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: { decrement: payment.amount },
              status: "PENDING",
            },
          });
        }

        await tx.customer.update({
          where: { id: payment.customerId },
          data: {
            balance: { increment: payment.amount },
          },
        });
      }

      const next = await tx.payment.update({
        where: { id: paymentId },
        data: { status },
      });

      await syncCustomerCreditFromBalance({
        customerId: payment.customerId,
        tx,
      });

      return next;
    });

    revalidatePath("/dashboard/collections");
    revalidatePath("/dashboard/customers");

    return { success: true, payment: updatedPayment };
  } catch (error) {
    console.error("Failed to update cheque status:", error);
    return { success: false, error: "Database Error" };
  }
}

// ============================================
// OUTSTANDING & OVERDUE ACTIONS
// ============================================

/**
 * Get all customers with overdue payments
 */
export async function getOverdueCustomers(companyName: string) {
  try {
    const today = new Date();

    // Get all pending invoices
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        companyName,
        status: "PENDING",
      },
      include: {
        customer: {
          include: {
            credit: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    // Group by customer and calculate overdue
    const customerMap = new Map<string, {
      customer: typeof pendingInvoices[0]["customer"];
      invoices: typeof pendingInvoices;
      totalOutstanding: number;
      oldestDueDate: Date;
      maxDaysPastDue: number;
    }>();

    for (const invoice of pendingInvoices) {
      if (!invoice.customer) continue;

      const creditDays = invoice.customer.credit?.creditDays || 30;
      const dueDate = invoice.dueDate || new Date(invoice.date.getTime() + creditDays * 24 * 60 * 60 * 1000);
      const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));

      if (daysPastDue <= 0) continue; // Not overdue yet

      const existing = customerMap.get(invoice.customerId!);
      const balance = invoice.totalAmount - invoice.paidAmount;

      if (existing) {
        existing.invoices.push(invoice);
        existing.totalOutstanding += balance;
        if (dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = dueDate;
        }
        if (daysPastDue > existing.maxDaysPastDue) {
          existing.maxDaysPastDue = daysPastDue;
        }
      } else {
        customerMap.set(invoice.customerId!, {
          customer: invoice.customer,
          invoices: [invoice],
          totalOutstanding: balance,
          oldestDueDate: dueDate,
          maxDaysPastDue: daysPastDue,
        });
      }
    }

    const overdueCustomers = Array.from(customerMap.values())
      .map((data) => ({
        customerId: data.customer!.id,
        customerName: data.customer!.name,
        phone: data.customer!.phone,
        totalOutstanding: data.totalOutstanding,
        invoiceCount: data.invoices.length,
        oldestDueDate: data.oldestDueDate,
        maxDaysPastDue: data.maxDaysPastDue,
        tier: data.customer!.credit?.tier || "C",
        isBlocked: data.customer!.credit?.isBlocked || false,
      }))
      .sort((a, b) => b.maxDaysPastDue - a.maxDaysPastDue);

    return { success: true, overdueCustomers };
  } catch (error) {
    console.error("Failed to get overdue customers:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Get all unpaid invoices for a company (for reminders)
 */
export async function getUnpaidInvoices(companyName: string) {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyName,
        status: "PENDING",
      },
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

    const today = new Date();

    const enrichedInvoices = invoices.map((inv) => {
      const creditDays = inv.customer?.credit?.creditDays || 30;
      const dueDate = inv.dueDate || new Date(inv.date.getTime() + creditDays * 24 * 60 * 60 * 1000);
      const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));

      return {
        ...inv,
        balance: inv.totalAmount - inv.paidAmount,
        dueDate,
        daysPastDue,
        isOverdue: daysPastDue > 0,
      };
    });

    return { success: true, invoices: enrichedInvoices };
  } catch (error) {
    console.error("Failed to get unpaid invoices:", error);
    return { success: false, error: "Database Error" };
  }
}

// ============================================
// BLOCKING ACTIONS
// ============================================

/**
 * Block a customer from credit
 */
export async function blockCustomer(customerId: string, reason: string) {
  try {
    await prisma.customerCredit.upsert({
      where: { customerId },
      update: {
        isBlocked: true,
        blockReason: reason,
        blockedAt: new Date(),
      },
      create: {
        customerId,
        creditLimit: 0,
        currentBalance: 0,
        availableCredit: 0,
        isBlocked: true,
        blockReason: reason,
        blockedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath("/dashboard/collections");

    return { success: true };
  } catch (error) {
    console.error("Failed to block customer:", error);
    return { success: false, error: "Database Error" };
  }
}

/**
 * Unblock a customer
 */
export async function unblockCustomer(customerId: string) {
  try {
    await prisma.customerCredit.update({
      where: { customerId },
      data: {
        isBlocked: false,
        blockReason: null,
        blockedAt: null,
      },
    });

    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath("/dashboard/collections");

    return { success: true };
  } catch (error) {
    console.error("Failed to unblock customer:", error);
    return { success: false, error: "Database Error" };
  }
}

// ============================================
// COLLECTION METRICS
// ============================================

/**
 * Get collection metrics for dashboard
 */
export async function getCollectionMetrics(companyName: string) {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total outstanding
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        companyName,
        status: "PENDING",
      },
    });

    const totalOutstanding = pendingInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
      0
    );

    // Collections in last 30 days
    const recentPayments = await prisma.payment.findMany({
      where: {
        companyName,
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ["CLEARED", "RECEIVED"] },
      },
    });

    const collectionsLast30Days = recentPayments.reduce(
      (sum, pay) => sum + pay.amount,
      0
    );

    // Overdue amount
    let overdueAmount = 0;
    let overdueCount = 0;

    for (const inv of pendingInvoices) {
      const dueDate = inv.dueDate || new Date(inv.date.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (today > dueDate) {
        overdueAmount += inv.totalAmount - inv.paidAmount;
        overdueCount++;
      }
    }

    // Blocked customers count
    const blockedCount = await prisma.customerCredit.count({
      where: {
        isBlocked: true,
        customer: {
          companyName,
        },
      },
    });

    return {
      success: true,
      metrics: {
        totalOutstanding,
        collectionsLast30Days,
        overdueAmount,
        overdueInvoiceCount: overdueCount,
        blockedCustomersCount: blockedCount,
        pendingInvoiceCount: pendingInvoices.length,
      },
    };
  } catch (error) {
    console.error("Failed to get collection metrics:", error);
    return { success: false, error: "Database Error" };
  }
}
