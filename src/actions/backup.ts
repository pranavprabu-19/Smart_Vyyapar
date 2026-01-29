"use server";

import { prisma } from "@/lib/db";

export async function exportDatabaseAction(companyName: string = "Sai Associates") {
    try {
        const [customers, products, invoices, companies] = await Promise.all([
            prisma.customer.findMany({ where: { companyName } }),
            prisma.product.findMany({ where: { companyName } }),
            prisma.invoice.findMany({ where: { companyName }, include: { items: true } }),
            // Assuming Company model exists, query by name (this table might be global or specific, usually global so maybe fetch just this one)
            prisma.company ? prisma.company.findMany({ where: { name: companyName } }) : Promise.resolve([])
        ]);

        return {
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                customers,
                products,
                invoices,
                companies
            }
        };
    } catch (e) {
        console.error("Backup Error", e);
        return { success: false, error: "Failed to create backup" };
    }
}
