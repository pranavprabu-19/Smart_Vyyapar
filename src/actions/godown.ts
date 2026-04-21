"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function getGodownsAction() {
    noStore();
    try {
        const godowns = await prisma.godown.findMany({
            orderBy: { name: 'asc' },
            include: {
                stocks: {
                    include: {
                        product: true
                    }
                }
            }
        });
        return { success: true, godowns };
    } catch (error) {
        console.error("Failed to fetch godowns:", error);
        return { success: false, godowns: [], error: "Failed to fetch godowns" };
    }
}

export async function createGodownAction(data: {
    name: string;
    location?: string;
    manager?: string;
    contact?: string;
}) {
    try {
        const godown = await prisma.godown.create({
            data: {
                name: data.name,
                location: data.location || null,
                manager: data.manager || null,
                contact: data.contact || null
            }
        });
        revalidatePath("/dashboard/godowns");
        revalidatePath("/dashboard/inventory");
        return { success: true, godown };
    } catch (error: any) {
        console.error("Failed to create godown:", error);
        return { success: false, error: error.message?.includes("Unique constraint") ? "Godown name already exists" : "Failed to create godown" };
    }
}

export async function updateGodownAction(
    id: string,
    data: {
        name?: string;
        location?: string;
        manager?: string;
        contact?: string;
    }
) {
    try {
        const godown = await prisma.godown.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.location !== undefined && { location: data.location || null }),
                ...(data.manager !== undefined && { manager: data.manager || null }),
                ...(data.contact !== undefined && { contact: data.contact || null })
            }
        });
        revalidatePath("/dashboard/godowns");
        revalidatePath("/dashboard/inventory");
        return { success: true, godown };
    } catch (error: any) {
        console.error("Failed to update godown:", error);
        return { success: false, error: error.message || "Failed to update godown" };
    }
}

export async function deleteGodownAction(id: string) {
    try {
        // Check if godown has stock
        const stockCount = await prisma.stock.count({
            where: { godownId: id }
        });

        if (stockCount > 0) {
            return { success: false, error: `Cannot delete godown. It has ${stockCount} stock entries. Please transfer or remove stock first.` };
        }

        await prisma.godown.delete({
            where: { id }
        });
        revalidatePath("/dashboard/godowns");
        revalidatePath("/dashboard/inventory");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete godown:", error);
        return { success: false, error: error.message || "Failed to delete godown" };
    }
}

export async function transferStockAction(data: {
    productId: string;
    fromGodownId: string;
    toGodownId: string;
    quantity: number;
    reason?: string;
}) {
    try {
        if (data.fromGodownId === data.toGodownId) {
            return { success: false, error: "Source and destination godowns cannot be the same" };
        }

        if (data.quantity <= 0) {
            return { success: false, error: "Transfer quantity must be greater than 0" };
        }

        // Check if source godown has enough stock
        const sourceStock = await prisma.stock.findUnique({
            where: {
                productId_godownId: {
                    productId: data.productId,
                    godownId: data.fromGodownId
                }
            }
        });

        if (!sourceStock || sourceStock.quantity < data.quantity) {
            return { success: false, error: "Insufficient stock in source godown" };
        }

        // Deduct from source
        await prisma.stock.update({
            where: {
                productId_godownId: {
                    productId: data.productId,
                    godownId: data.fromGodownId
                }
            },
            data: {
                quantity: {
                    decrement: data.quantity
                }
            }
        });

        // Add to destination
        await prisma.stock.upsert({
            where: {
                productId_godownId: {
                    productId: data.productId,
                    godownId: data.toGodownId
                }
            },
            update: {
                quantity: {
                    increment: data.quantity
                }
            },
            create: {
                productId: data.productId,
                godownId: data.toGodownId,
                quantity: data.quantity
            }
        });

        // Update total product stock (recalculate from all godowns)
        const aggregations = await prisma.stock.aggregate({
            where: { productId: data.productId },
            _sum: { quantity: true }
        });

        const totalStock = aggregations._sum.quantity || 0;

        await prisma.product.update({
            where: { id: data.productId },
            data: { stock: totalStock }
        });

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/godowns");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to transfer stock:", error);
        return { success: false, error: error.message || "Failed to transfer stock" };
    }
}

export async function getGodownStockAction(godownId: string) {
    noStore();
    try {
        const stocks = await prisma.stock.findMany({
            where: { godownId },
            include: {
                product: true,
                godown: true
            },
            orderBy: {
                product: {
                    name: 'asc'
                }
            }
        });
        return { success: true, stocks };
    } catch (error) {
        console.error("Failed to fetch godown stock:", error);
        return { success: false, stocks: [] };
    }
}

export async function getGodownStatsAction() {
    noStore();
    const stockSemantics = {
        scope: "GODOWN_LEVEL",
        movementSources: ["INVOICE_DEDUCTION", "STOCK_TRANSFER", "MANUAL_STOCK_UPDATE"],
    } as const;
    try {
        // Check if godown model exists in Prisma client
        if (!prisma.godown) {
            console.warn("Godown model not available in Prisma client. Please run: npx prisma generate");
            return { success: false, stats: [], stockSemantics };
        }

        const godowns = await prisma.godown.findMany({
            include: {
                stocks: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const stats = godowns.map(godown => {
            const totalItems = godown.stocks.length;
            const totalQuantity = godown.stocks.reduce((sum, stock) => sum + stock.quantity, 0);
            const totalValue = godown.stocks.reduce((sum, stock) => sum + (stock.quantity * stock.product.price), 0);
            const lowStockItems = godown.stocks.filter(stock => stock.quantity <= stock.product.minStock).length;

            return {
                id: godown.id,
                name: godown.name,
                location: godown.location,
                totalItems,
                totalQuantity,
                totalValue,
                lowStockItems
            };
        });

        return { success: true, stats, stockSemantics };
    } catch (error: any) {
        console.error("Failed to fetch godown stats:", error);
        // If it's a model not found error, return empty stats
        if (error?.message?.includes("godown") || error?.message?.includes("Cannot read properties")) {
            console.warn("Godown model may not be available. Please run: npx prisma generate && npx prisma migrate dev");
            return { success: false, stats: [], stockSemantics };
        }
        return { success: false, stats: [], stockSemantics };
    }
}
