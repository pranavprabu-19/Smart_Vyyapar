"use server";

// Action to handle photo persistence
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type StockSnapshotItem = { productId: string; name: string; qty: number };

export async function savePhotoAction(data: {
    url: string;
    lat: number;
    lng: number;
    address?: string;
    accuracy?: number;
    isMock: boolean;
    userName: string;
    userRole: string;
    companyName: string;
    stockSnapshot?: StockSnapshotItem[];
}) {
    try {
        const stockJson = data.stockSnapshot && data.stockSnapshot.length > 0
            ? JSON.stringify(data.stockSnapshot)
            : null;

        const photo = await prisma.photo.create({
            data: {
                url: data.url,
                lat: data.lat,
                lng: data.lng,
                address: data.address,
                accuracy: data.accuracy,
                isMock: data.isMock,
                stockSnapshot: stockJson,
                userName: data.userName,
                userRole: data.userRole,
                companyName: data.companyName
            }
        });

        revalidatePath("/dashboard/photos");
        return { success: true, photo };
    } catch (error: any) {
        console.error("Failed to save photo detailed error:", error);
        return { success: false, error: error?.message || "Failed to save photo to database." };
    }
}

export async function getPhotosAction(companyName: string) {
    try {
        const photos = await prisma.photo.findMany({
            where: { companyName },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to recent 50 for performance
        });
        return { success: true, photos };
    } catch (error) {
        console.error("Failed to fetch photos:", error);
        return { success: false, photos: [] };
    }
}
