"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markAttendanceAction(data: {
    employeeId: string; // The database ID (cuid), not the custom ID
    status: string; // PRESENT, ABSENT
    date: string; // ISO String or YYYY-MM-DD
    checkIn?: string;
}) {
    try {
        const attendanceDate = new Date(data.date);

        const attendance = await prisma.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId: data.employeeId,
                    date: attendanceDate
                }
            },
            update: {
                status: data.status,
                checkIn: data.checkIn,
                updatedAt: new Date()
            },
            create: {
                employeeId: data.employeeId,
                status: data.status,
                date: attendanceDate,
                checkIn: data.checkIn
            }
        });

        revalidatePath("/dashboard/attendance");
        return { success: true, attendance };
    } catch (error) {
        console.error("Error marking attendance:", error);
        return { success: false, error: "Failed to mark attendance" };
    }
}

export async function getAttendanceAction(employeeIds: string[], month: number, year: number) {
    // Get start and end of month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    try {
        const records = await prisma.attendance.findMany({
            where: {
                employeeId: { in: employeeIds },
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        return { success: true, records };
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return { success: false, error: "Failed to fetch attendance" };
    }
}
