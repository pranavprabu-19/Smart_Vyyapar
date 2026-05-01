"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface CreateAssetData {
    companyName: string;
    assetType: string;
    name: string;
    description?: string;
    serialNumber?: string;
    purchaseValue: number;
    purchaseDate: Date;
    depreciationRate?: number;
    location?: string;
    assignedTo?: string;
}

export interface UpdateAssetData {
    assetType?: string;
    name?: string;
    description?: string;
    serialNumber?: string;
    currentValue?: number;
    depreciationRate?: number;
    location?: string;
    status?: string;
    assignedTo?: string;
    maintenanceNotes?: string;
}

export async function createAssetAction(data: CreateAssetData) {
    try {
        const company = await prisma.company.findFirst({ where: { name: data.companyName }});
        if (!company) throw new Error("Company not found");

        const asset = await prisma.asset.create({
            data: {
                companyId: company.id,
                companyName: data.companyName,
                assetType: data.assetType,
                name: data.name,
                description: data.description,
                serialNumber: data.serialNumber,
                purchaseValue: data.purchaseValue,
                currentValue: data.purchaseValue, // Initially same as purchase value
                purchaseDate: data.purchaseDate,
                depreciationRate: data.depreciationRate || 10,
                location: data.location,
                assignedTo: data.assignedTo,
            },
        });

        revalidatePath("/dashboard/assets");
        return { success: true, asset };
    } catch (error) {
        console.error("Error creating asset:", error);
        return { success: false, error: "Failed to create asset" };
    }
}

export async function getAssetsAction(companyName: string) {
    try {
        const assets = await prisma.asset.findMany({
            where: { companyName },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, assets };
    } catch (error) {
        console.error("Error fetching assets:", error);
        return { success: false, error: "Failed to fetch assets", assets: [] };
    }
}

export async function updateAssetAction(id: string, data: UpdateAssetData) {
    try {
        const asset = await prisma.asset.update({
            where: { id },
            data: data,
        });

        revalidatePath("/dashboard/assets");
        return { success: true, asset };
    } catch (error) {
        console.error("Error updating asset:", error);
        return { success: false, error: "Failed to update asset" };
    }
}

export async function deleteAssetAction(id: string) {
    try {
        await prisma.asset.delete({
            where: { id },
        });

        revalidatePath("/dashboard/assets");
        return { success: true };
    } catch (error) {
        console.error("Error deleting asset:", error);
        return { success: false, error: "Failed to delete asset" };
    }
}

export async function calculateAssetDepreciationAction(id: string) {
    try {
        const asset = await prisma.asset.findUnique({
            where: { id },
        });

        if (!asset) {
            return { success: false, error: "Asset not found" };
        }

        // Calculate years since purchase
        const yearsSincePurchase =
            (new Date().getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

        // Calculate depreciated value: V = P * (1 - r)^t
        const depreciatedValue =
            Number(asset.purchaseValue) * Math.pow(1 - Number(asset.depreciationRate || 10) / 100, yearsSincePurchase);

        // Update current value
        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: { currentValue: Math.max(0, depreciatedValue) },
        });

        revalidatePath("/dashboard/assets");
        return { success: true, asset: updatedAsset };
    } catch (error) {
        console.error("Error calculating depreciation:", error);
        return { success: false, error: "Failed to calculate depreciation" };
    }
}

export async function getAssetStatsAction(companyName: string) {
    try {
        const [totalAssets, totalValue, assetsByType] = await Promise.all([
            prisma.asset.count({ where: { companyName } }),
            prisma.asset.aggregate({
                _sum: { currentValue: true },
                where: { companyName },
            }),
            prisma.asset.groupBy({
                by: ["assetType"],
                _count: true,
                _sum: { currentValue: true },
                where: { companyName },
            }),
        ]);

        return {
            success: true,
            stats: {
                totalAssets,
                totalValue: totalValue._sum.currentValue || 0,
                byType: assetsByType.map((item: any) => ({
                    type: item.assetType,
                    count: item._count,
                    value: item._sum.currentValue || 0,
                })),
            },
        };
    } catch (error) {
        console.error("Error fetching asset stats:", error);
        return { success: false, error: "Failed to fetch asset stats" };
    }
}
