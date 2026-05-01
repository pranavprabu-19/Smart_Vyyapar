"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Types
export interface CreateSchemeData {
  companyName: string;
  name: string;
  description?: string;
  type: "QUANTITY_DISCOUNT" | "BUY_X_GET_Y" | "FLAT_DISCOUNT" | "PERCENTAGE_DISCOUNT" | "COMBO";
  minQuantity?: number;
  minAmount?: number;
  buyQuantity?: number;
  getQuantity?: number;
  discountPercent?: number;
  discountAmount?: number;
  freeProductId?: string;
  startDate: Date;
  endDate: Date;
  applicableProducts?: string[]; // JSON array of product IDs
  applicableCustomers?: string[]; // JSON array of customer IDs
  customerTiers?: string[]; // A, B, C
  budget?: number;
  maxUsagePerCustomer?: number;
}

export interface SchemeWithStats {
  id: string;
  companyName: string;
  name: string;
  description: string | null;
  type: string;
  minQuantity: number | null;
  minAmount: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  freeProductId: string | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  applicableProducts: string | null;
  applicableCustomers: string | null;
  customerTiers: string | null;
  budget: number | null;
  usedBudget: number;
  maxUsagePerCustomer: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    appliedOrders: number;
  };
  totalDiscount: number;
  roi: number;
}

// Get all schemes
export async function getSchemesAction(companyName: string, filters?: {
  isActive?: boolean;
  type?: string;
}) {
  try {
    const where: any = { companyName };
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
      if (filters.isActive) {
        where.startDate = { lte: new Date() };
        where.endDate = { gte: new Date() };
      }
    }
    if (filters?.type) where.type = filters.type;

    const schemes = await prisma.scheme.findMany({
      where,
      include: {
        _count: {
          select: { appliedOrders: true }
        },
        appliedOrders: {
          select: { discount: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate stats
    const schemesWithStats = schemes.map(scheme => {
      const totalDiscount = scheme.appliedOrders.reduce((sum, o) => sum + Number(o.discount), 0);
      const usageCount = scheme._count.appliedOrders;
      const roi = Number(scheme.usedBudget) > 0 ? ((totalDiscount / Number(scheme.usedBudget)) * 100) : 0;

      return {
        ...scheme,
        appliedOrders: undefined, // Remove detailed data
        totalDiscount,
        roi,
      };
    });

    return { success: true, schemes: schemesWithStats };
  } catch (error) {
    console.error("Failed to get schemes:", error);
    return { success: false, error: "Failed to fetch schemes" };
  }
}

// Get single scheme
export async function getSchemeAction(schemeId: string) {
  try {
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
      include: {
        _count: {
          select: { appliedOrders: true }
        },
        appliedOrders: {
          include: {
            order: {
              select: { orderNo: true, customer: { select: { name: true } }, totalAmount: true }
            }
          },
          take: 10,
          orderBy: { order: { createdAt: 'desc' } }
        }
      }
    });

    if (!scheme) {
      return { success: false, error: "Scheme not found" };
    }

    return { success: true, scheme };
  } catch (error) {
    console.error("Failed to get scheme:", error);
    return { success: false, error: "Failed to fetch scheme" };
  }
}

// Create new scheme
export async function createSchemeAction(data: CreateSchemeData) {
  try {
    const company = await prisma.company.findFirst({ where: { name: data.companyName } });
    if (!company) throw new Error("Company not found");

    const scheme = await prisma.scheme.create({
      data: {
        companyId: company.id,
        companyName: data.companyName,
        name: data.name,
        description: data.description,
        type: data.type,
        minQuantity: data.minQuantity,
        minAmount: data.minAmount,
        buyQuantity: data.buyQuantity,
        getQuantity: data.getQuantity,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        freeProductId: data.freeProductId,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
        applicableProducts: data.applicableProducts ? (data.applicableProducts as any) : null,
        applicableCustomers: data.applicableCustomers ? (data.applicableCustomers as any) : null,
        customerTiers: data.customerTiers ? (data.customerTiers as any) : null,
        budget: data.budget,
        maxUsagePerCustomer: data.maxUsagePerCustomer,
      }
    });

    revalidatePath("/dashboard/schemes");
    return { success: true, scheme };
  } catch (error) {
    console.error("Failed to create scheme:", error);
    return { success: false, error: "Failed to create scheme" };
  }
}

// Update scheme
export async function updateSchemeAction(schemeId: string, data: Partial<CreateSchemeData>) {
  try {
    const updateData: any = { ...data };
    if (data.applicableProducts) updateData.applicableProducts = data.applicableProducts;
    if (data.applicableCustomers) updateData.applicableCustomers = data.applicableCustomers;
    if (data.customerTiers) updateData.customerTiers = data.customerTiers;

    const scheme = await prisma.scheme.update({
      where: { id: schemeId },
      data: updateData
    });

    revalidatePath("/dashboard/schemes");
    return { success: true, scheme };
  } catch (error) {
    console.error("Failed to update scheme:", error);
    return { success: false, error: "Failed to update scheme" };
  }
}

// Toggle scheme active status
export async function toggleSchemeStatusAction(schemeId: string) {
  try {
    const scheme = await prisma.scheme.findUnique({ where: { id: schemeId } });
    if (!scheme) return { success: false, error: "Scheme not found" };

    const updated = await prisma.scheme.update({
      where: { id: schemeId },
      data: { isActive: !scheme.isActive }
    });

    revalidatePath("/dashboard/schemes");
    return { success: true, scheme: updated };
  } catch (error) {
    console.error("Failed to toggle scheme:", error);
    return { success: false, error: "Failed to toggle scheme status" };
  }
}

// Delete scheme
export async function deleteSchemeAction(schemeId: string) {
  try {
    await prisma.scheme.delete({ where: { id: schemeId } });
    revalidatePath("/dashboard/schemes");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete scheme:", error);
    return { success: false, error: "Failed to delete scheme" };
  }
}

// Get scheme metrics
export async function getSchemeMetricsAction(companyName: string) {
  try {
    const now = new Date();

    const [totalSchemes, activeSchemes, totalDiscountGiven, topScheme] = await Promise.all([
      prisma.scheme.count({ where: { companyName } }),
      prisma.scheme.count({
        where: { companyName, isActive: true, startDate: { lte: now }, endDate: { gte: now } }
      }),
      prisma.orderScheme.aggregate({
        _sum: { discount: true },
        where: { scheme: { companyName } }
      }),
      prisma.orderScheme.groupBy({
        by: ['schemeId'],
        _sum: { discount: true },
        _count: { id: true },
        where: { scheme: { companyName } },
        orderBy: { _count: { id: 'desc' } },
        take: 1
      })
    ]);

    let topSchemeDetails = null;
    if (topScheme.length > 0) {
      topSchemeDetails = await prisma.scheme.findUnique({
        where: { id: topScheme[0].schemeId },
        select: { name: true }
      });
    }

    return {
      success: true,
      metrics: {
        totalSchemes,
        activeSchemes,
        totalDiscountGiven: totalDiscountGiven._sum.discount || 0,
        topScheme: topSchemeDetails?.name || "N/A",
        topSchemeUsage: topScheme[0]?._count.id || 0
      }
    };
  } catch (error) {
    console.error("Failed to get scheme metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}

// Calculate applicable schemes for an order
export async function calculateApplicableSchemes(
  companyName: string,
  customerId: string,
  items: { productId: string; quantity: number; price: number }[]
) {
  try {
    const now = new Date();
    
    // Get customer tier
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        credit: {
          select: { tier: true }
        }
      }
    });

    // Get active schemes
    const schemes = await prisma.scheme.findMany({
      where: {
        companyName,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      }
    });

    const applicableSchemes: { schemeId: string; name: string; type: string; discount: number; description: string }[] = [];

    const orderTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    for (const scheme of schemes) {
      let isApplicable = true;
      let discount = 0;
      let description = "";

      // Check customer tier
      if (scheme.customerTiers) {
        const tiers = scheme.customerTiers as any as string[];
        const customerTier = customer?.credit?.tier || "C";
        if (!tiers.includes(customerTier)) {
          isApplicable = false;
        }
      }

      // Check minimum order amount
      if (scheme.minAmount && orderTotal < Number(scheme.minAmount)) {
        isApplicable = false;
      }

      // Check minimum quantity
      if (scheme.minQuantity && totalQuantity < scheme.minQuantity) {
        isApplicable = false;
      }

      if (isApplicable) {
        switch (scheme.type) {
          case "PERCENTAGE_DISCOUNT":
            discount = (orderTotal * Number(scheme.discountPercent || 0)) / 100;
            description = `${scheme.discountPercent}% discount`;
            break;
          case "FLAT_DISCOUNT":
            discount = Number(scheme.discountAmount || 0);
            description = `Flat ₹${discount} off`;
            break;
          case "QUANTITY_DISCOUNT":
            if (scheme.discountPercent) {
              discount = (orderTotal * Number(scheme.discountPercent)) / 100;
              description = `${scheme.discountPercent}% off on ${scheme.minQuantity}+ units`;
            }
            break;
          case "BUY_X_GET_Y":
            // Calculate free items based on quantity
            const buyQty = scheme.buyQuantity || 0;
            const getQty = scheme.getQuantity || 0;
            if (buyQty > 0 && totalQuantity >= buyQty) {
              const freeUnits = Math.floor(totalQuantity / buyQty) * getQty;
              // Estimate value of free items
              const avgPrice = orderTotal / totalQuantity;
              discount = freeUnits * avgPrice;
              description = `Buy ${buyQty} Get ${getQty} Free`;
            }
            break;
        }

        if (discount > 0) {
          applicableSchemes.push({
            schemeId: scheme.id,
            name: scheme.name,
            type: scheme.type,
            discount,
            description
          });
        }
      }
    }

    return { success: true, applicableSchemes };
  } catch (error) {
    console.error("Failed to calculate schemes:", error);
    return { success: false, error: "Failed to calculate applicable schemes" };
  }
}
