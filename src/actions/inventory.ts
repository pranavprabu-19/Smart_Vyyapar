"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function getProductsAction(companyName: string = "Sai Associates") {
    noStore();
    try {
        const products = await prisma.product.findMany({
            where: { companyName },
            orderBy: { name: 'asc' },
            include: {
                stocks: {
                    include: { godown: true }
                }
            }
        });
        return { success: true, products };
    } catch (error) {
        console.error("Failed to fetch products:", error);
        return { success: false, products: [] };
    }
}

export async function createProductAction(data: {
    sku: string;
    name: string;
    price: number;
    stock: number;
    costPrice?: number;
    category?: string;
    minStock?: number;
    companyName?: string;
    godownId?: string; // Optional: Initial stock location
}) {
    try {
        const product = await prisma.product.create({
            data: {
                sku: data.sku,
                name: data.name,
                price: data.price,
                stock: data.stock, // Total stock
                costPrice: data.costPrice || 0,
                category: data.category || "General",
                minStock: data.minStock || 10,
                companyName: data.companyName || "Sai Associates"
            }
        });

        // Add initial stock to godown if specified, or default
        if (data.stock > 0) {
            const godownId = data.godownId || await getDefaultGodownId();
            await prisma.stock.create({
                data: {
                    productId: product.id,
                    godownId: godownId,
                    quantity: data.stock
                }
            });
        }

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/reports/balance-sheet");
        return { success: true, product };
    } catch (error) {
        console.error("Failed to create product:", error);
        return { success: false, error: "Failed to create product. SKU might be duplicate.", details: error };
    }
}

async function getDefaultGodownId() {
    const godown = await prisma.godown.findFirst({
        orderBy: { createdAt: 'asc' } // Oldest godown is default? Or by name?
    });

    if (godown) return godown.id;

    // Create Default Godown if none exists
    const newGodown = await prisma.godown.create({
        data: {
            name: "Main Warehouse",
            location: "Primary Location"
        }
    });
    return newGodown.id;
}

export async function updateStockAction(
    sku: string,
    quantity: number,
    type: 'ADD' | 'SET' | 'DEDUCT' = 'ADD',
    godownId?: string
) {
    try {
        const product = await prisma.product.findUnique({ where: { sku } });
        if (!product) throw new Error("Product not found");

        const targetGodownId = godownId || await getDefaultGodownId();

        // 1. Update/Create Stock Record
        const currentStockRecord = await prisma.stock.findUnique({
            where: {
                productId_godownId: {
                    productId: product.id,
                    godownId: targetGodownId
                }
            }
        });

        let newQuantity = quantity;
        const currentQty = currentStockRecord?.quantity || 0;

        if (type === 'ADD') newQuantity = currentQty + quantity;
        if (type === 'DEDUCT') newQuantity = Math.max(0, currentQty - quantity);
        // If SET, newQuantity is just quantity

        await prisma.stock.upsert({
            where: {
                productId_godownId: {
                    productId: product.id,
                    godownId: targetGodownId
                }
            },
            update: { quantity: newQuantity },
            create: {
                productId: product.id,
                godownId: targetGodownId,
                quantity: newQuantity
            }
        });

        // 2. Sync Total Product Stock
        // Recalculate total from all godowns to be safe
        const aggregations = await prisma.stock.aggregate({
            where: { productId: product.id },
            _sum: { quantity: true }
        });

        const totalStock = aggregations._sum.quantity || 0;

        const updatedProduct = await prisma.product.update({
            where: { id: product.id }, // Use ID for safety
            data: { stock: totalStock }
        });

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/reports/balance-sheet");
        return { success: true, product: updatedProduct };
    } catch (error) {
        console.error("Failed to update stock:", error);
        return { success: false, error: "Failed to update item stock." };
    }
}
