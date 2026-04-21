"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Types
export interface CreateOrderData {
  companyName: string;
  customerId: string;
  employeeId?: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
    discount?: number;
    gstRate?: number;
  }[];
  deliveryNotes?: string;
}

export interface OrderWithDetails {
  id: string;
  orderNo: string;
  companyName: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  schemeDiscount: number;
  taxAmount: number;
  totalAmount: number;
  deliveryNotes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  };
  employee: {
    id: string;
    name: string;
  };
  items: {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    discount: number;
    gstRate: number;
    total: number;
    product: {
      id: string;
      name: string;
      sku: string;
    };
  }[];
  appliedSchemes: {
    id: string;
    discount: number;
    description: string | null;
    scheme: {
      name: string;
    };
  }[];
}

// Generate unique order number
function generateOrderNo(): string {
  const date = new Date();
  const prefix = "ORD";
  const timestamp = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

// Get all orders for a company
export async function getOrdersAction(companyName: string, filters?: {
  status?: string;
  customerId?: string;
  employeeId?: string;
  fromDate?: Date;
  toDate?: Date;
}) {
  try {
    const where: any = { companyName };

    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, address: true }
        },
        employee: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true }
            }
          }
        },
        appliedSchemes: {
          include: {
            scheme: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, orders };
  } catch (error) {
    console.error("Failed to get orders:", error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

// Get single order by ID
export async function getOrderAction(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, address: true }
        },
        employee: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true }
            }
          }
        },
        appliedSchemes: {
          include: {
            scheme: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, order };
  } catch (error) {
    console.error("Failed to get order:", error);
    return { success: false, error: "Failed to fetch order" };
  }
}

// Create new order
export async function createOrderAction(data: CreateOrderData) {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyName: data.companyName },
      select: { id: true }
    });
    if (!customer) {
      return { success: false, error: "Invalid customer selected for this company" };
    }

    const itemProductRefs = [...new Set(data.items.map((item) => item.productId))];
    const matchedProducts = await prisma.product.findMany({
      where: {
        companyName: data.companyName,
        OR: [
          { id: { in: itemProductRefs } },
          { sku: { in: itemProductRefs } }
        ]
      },
      select: { id: true, sku: true }
    });
    const productIdByRef = new Map<string, string>();
    matchedProducts.forEach((product) => {
      productIdByRef.set(product.id, product.id);
      productIdByRef.set(product.sku, product.id);
    });
    const missingProducts = itemProductRefs.filter((ref) => !productIdByRef.has(ref));
    if (missingProducts.length > 0) {
      return { success: false, error: `Missing products: ${missingProducts.join(", ")}` };
    }

    let employeeIdToUse = data.employeeId;
    if (employeeIdToUse) {
      const employee = await prisma.employee.findFirst({
        where: { id: employeeIdToUse, companyName: data.companyName },
        select: { id: true }
      });
      if (!employee) {
        employeeIdToUse = undefined;
      }
    }
    if (!employeeIdToUse) {
      const fallbackEmployee = await prisma.employee.findFirst({
        where: { companyName: data.companyName, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { id: true }
      });
      if (!fallbackEmployee) {
        return { success: false, error: "No active employee found. Please create an employee profile first." };
      }
      employeeIdToUse = fallbackEmployee.id;
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = data.items.map(item => {
      const itemSubtotal = item.quantity * item.price;
      const itemDiscount = item.discount || 0;
      const itemTax = ((itemSubtotal - itemDiscount) * (item.gstRate || 18)) / 100;
      const itemTotal = itemSubtotal - itemDiscount + itemTax;

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      return {
        productId: productIdByRef.get(item.productId)!,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
        gstRate: item.gstRate || 18,
        total: itemTotal
      };
    });

    const totalDiscount = processedItems.reduce((sum, item) => sum + item.discount, 0);
    const totalAmount = subtotal - totalDiscount + taxAmount;

    const order = await prisma.order.create({
      data: {
        orderNo: generateOrderNo(),
        companyName: data.companyName,
        customerId: data.customerId,
        employeeId: employeeIdToUse,
        status: "DRAFT",
        subtotal,
        discountAmount: totalDiscount,
        schemeDiscount: 0,
        taxAmount,
        totalAmount,
        deliveryNotes: data.deliveryNotes,
        items: {
          create: processedItems
        }
      },
      include: {
        customer: { select: { name: true } },
        employee: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } }
      }
    });

    revalidatePath("/dashboard/orders");
    return { success: true, order };
  } catch (error) {
    console.error("Failed to create order:", error);
    return { success: false, error: "Failed to create order" };
  }
}

// Submit order for approval
export async function submitOrderForApproval(orderId: string) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: "PENDING_APPROVAL" }
    });

    revalidatePath("/dashboard/orders");
    return { success: true, order };
  } catch (error) {
    console.error("Failed to submit order:", error);
    return { success: false, error: "Failed to submit order for approval" };
  }
}

// Approve order
export async function approveOrderAction(orderId: string, approvedBy: string) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "APPROVED",
        approvedBy,
        approvedAt: new Date()
      }
    });

    revalidatePath("/dashboard/orders");
    return { success: true, order };
  } catch (error) {
    console.error("Failed to approve order:", error);
    return { success: false, error: "Failed to approve order" };
  }
}

// Reject order
export async function rejectOrderAction(orderId: string, rejectedBy: string, reason: string) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason
      }
    });

    revalidatePath("/dashboard/orders");
    return { success: true, order };
  } catch (error) {
    console.error("Failed to reject order:", error);
    return { success: false, error: "Failed to reject order" };
  }
}

// Mark order as dispatched
export async function dispatchOrderAction(orderId: string) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "DISPATCHED",
        dispatchedAt: new Date()
      }
    });

    revalidatePath("/dashboard/orders");
    return { success: true, order };
  } catch (error) {
    console.error("Failed to dispatch order:", error);
    return { success: false, error: "Failed to dispatch order" };
  }
}

// Mark order as delivered
export async function deliverOrderAction(orderId: string) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date()
      }
    });

    revalidatePath("/dashboard/orders");
    return { success: true, order };
  } catch (error) {
    console.error("Failed to deliver order:", error);
    return { success: false, error: "Failed to deliver order" };
  }
}

// Convert order to invoice
export async function convertOrderToInvoice(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status !== "APPROVED" && order.status !== "DISPATCHED") {
      return { success: false, error: "Only approved or dispatched orders can be converted to invoices" };
    }

    // Generate invoice number
    const now = new Date();
    const prefix = "INV";
    const timestamp = now.getTime().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    const invoiceNo = `${prefix}-${timestamp}${random}`;

    // Create invoice from order
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        companyName: order.companyName,
        customerId: order.customerId,
        customerName: order.customer.name,
        paymentMode: "CREDIT",
        billingAddress: order.customer.address || "",
        customerDetails: JSON.stringify(order.customer),
        date: now,
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        totalAmount: order.totalAmount,
        paidAmount: 0,
        status: "PENDING",
        items: {
          create: order.items.map(item => ({
            description: item.product.name,
            quantity: item.quantity,
            price: item.price,
            productId: item.productId
          }))
        }
      }
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date()
      }
    });

    // Update customer balance
    await prisma.customer.update({
      where: { id: order.customerId },
      data: {
        balance: { increment: order.totalAmount }
      }
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/invoices");

    return { success: true, invoice };
  } catch (error) {
    console.error("Failed to convert order to invoice:", error);
    return { success: false, error: "Failed to convert order to invoice" };
  }
}

// Get order metrics
export async function getOrderMetricsAction(companyName: string) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      pendingApproval,
      approved,
      delivered,
      monthlyValue
    ] = await Promise.all([
      prisma.order.count({ where: { companyName } }),
      prisma.order.count({ where: { companyName, status: "PENDING_APPROVAL" } }),
      prisma.order.count({ where: { companyName, status: "APPROVED" } }),
      prisma.order.count({ where: { companyName, status: "DELIVERED" } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { companyName, createdAt: { gte: startOfMonth } }
      })
    ]);

    return {
      success: true,
      metrics: {
        totalOrders,
        pendingApproval,
        approved,
        delivered,
        monthlyValue: monthlyValue._sum.totalAmount || 0
      }
    };
  } catch (error) {
    console.error("Failed to get order metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}
