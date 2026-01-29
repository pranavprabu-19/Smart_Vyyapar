"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createVehicleAction(data: {
    regNo: string;
    model: string;
    type: string;
    fuelType?: string;
    status: string;
    details?: string;
}) {
    try {
        const vehicle = await prisma.vehicle.create({
            data: {
                regNo: data.regNo,
                model: data.model,
                type: data.type,
                fuelType: data.fuelType || "DIESEL",
                status: data.status,
                details: data.details,
            }
        });
        revalidatePath("/dashboard/vehicles");
        return { success: true, vehicle };
    } catch (error: any) {
        console.error("Failed to create vehicle:", error);
        if (error.code === 'P2002') {
            return { success: false, error: "A vehicle with this Registration Number already exists." };
        }
        return { success: false, error: error.message || "Failed to create vehicle." };
    }
}

export async function getVehiclesAction() {
    try {
        const vehicles = await prisma.vehicle.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, vehicles };
    } catch (error) {
        console.error("Failed to fetch vehicles:", error);
        return { success: false, vehicles: [] };
    }
}

export async function updateVehicleStatusAction(id: string, status: string, totalDistance?: number) {
    try {
        const updateData: any = { status };
        // If distance provided (e.g. from Trip End), update it
        if (totalDistance !== undefined) {
            updateData.totalDistance = {
                set: totalDistance // Or increment? Usually trip provides "End Reading" which is absolute.
            };
        }

        await prisma.vehicle.update({
            where: { id },
            data: updateData
        });
        revalidatePath("/dashboard/vehicles");
        return { success: true };
    } catch (error) {
        console.error("Failed to update vehicle:", error);
        return { success: false, error: "Update failed" };
    }
}

export async function deleteVehicleAction(id: string) {
    try {
        await prisma.vehicle.delete({
            where: { id }
        });
        revalidatePath("/dashboard/vehicles");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete vehicle:", error);
        return { success: false, error: "Delete failed" };
    }
}
