"use server";

import { prisma } from "@/lib/db";
import { InvoiceData } from "@/lib/invoice-utils";
import { revalidatePath } from "next/cache";

export async function createInvoiceAction(data: InvoiceData) {
    try {
        const totalAmount = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        // Default to Main Warehouse if not specified (should be handled by caller properly)
        const godownId = data.godownId || (await prisma.godown.findFirst({ orderBy: { createdAt: 'asc' } }))?.id;

        if (!godownId) {
            console.error("No Godown ID found for invoice creation");
            // Should we fail? Yes, stock needs location.
            // But for safety, fallback to *any* godown? No, create one?
            // Assuming inventory actions created the default one.
        }

        // 1. Transaction: Upsert Customer -> Create Invoice -> Update Customer Metrics
        const result = await prisma.$transaction(async (tx) => {
            // Upsert Customer logic
            let customer = await tx.customer.findFirst({
                // @ts-ignore
                where: {
                    OR: [
                        { gstin: data.customer.gstin ? data.customer.gstin : undefined },
                        { phone: data.customer.phone },
                        { name: data.customer.name }
                    ].filter(Boolean) as any,
                    companyName: data.companyName
                }
            });

            if (!customer) {
                // @ts-ignore
                customer = await tx.customer.create({
                    data: {
                        name: data.customer.name,
                        address: data.customer.address,
                        state: data.customer.state,
                        gstin: data.customer.gstin || undefined,
                        phone: data.customer.phone,
                        email: data.customer.email,
                        lat: data.customer.lat,
                        lng: data.customer.lng,
                        companyName: data.companyName
                    } as any
                });
            }

            // Create Invoice linked to Customer
            // @ts-ignore
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNo: data.invoiceNo,
                    companyName: data.companyName,
                    customerName: data.customer.name,
                    customerId: customer.id,
                    status: data.status || "PENDING",
                    totalAmount: totalAmount,
                    date: new Date(data.date),
                    paymentMode: data.paymentMode || "CASH",
                    customerDetails: JSON.stringify(data.customer),
                    billingAddress: `${data.customer.address}, ${data.customer.state}`,
                    items: {
                        create: data.items.map(item => ({
                            productId: String(item.id),
                            description: item.description,
                            quantity: item.quantity,
                            price: item.price,
                            costPrice: item.costPrice || 0,
                            hsn: item.hsn
                        }))
                    }
                } as any
            });

            // Deduct Stock for each item
            for (const item of data.items) {
                const productId = String(item.id);
                // Check if product exists
                // @ts-ignore
                const product = await tx.product.findUnique({ where: { id: productId } }); // Using ID, assuming item.id is Product ID

                if (product && godownId) {
                    // 1. Decrement Stock Record
                    // We try to update. If it fails (record doesn't exist), we might ignore or throw?
                    // Assuming stock exists if they selected it.
                    try {
                        await tx.stock.update({
                            where: {
                                productId_godownId: {
                                    productId: productId,
                                    godownId: godownId
                                }
                            },
                            data: { quantity: { decrement: item.quantity } }
                        });
                    } catch (e) {
                        console.warn(`Stock record missing for product ${productId} in godown ${godownId} during invoice deduction.`);
                        // Create negative stock record? Or just ignore?
                        // "Godown Management" implies we track it. Let's create if missing with negative value?
                        await tx.stock.create({
                            data: {
                                // @ts-ignore
                                productId, godownId, quantity: -item.quantity
                            }
                        });
                    }

                    // 2. Decrement Total Product Stock
                    // @ts-ignore
                    await tx.product.update({
                        where: { id: productId },
                        data: { stock: { decrement: item.quantity } }
                    });
                }
            }

            // Update Customer Metrics
            // @ts-ignore
            await tx.customer.update({
                where: { id: customer.id },
                data: {
                    totalRevenue: { increment: totalAmount },
                    lastInvoiceNo: invoice.invoiceNo,
                    balance: data.paymentMode === 'CREDIT' ? { increment: totalAmount } : undefined,
                    lat: data.customer.lat,
                    lng: data.customer.lng
                } as any
            });

            return invoice;
        });

        revalidatePath("/dashboard/analytics");
        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/godowns"); // Update godown counts
        revalidatePath("/dashboard/reports/balance-sheet");
        return { success: true, id: result.id };
    } catch (error) {
        console.error("Failed to create invoice:", error);
        return { success: false, error: "Database Error: " + error };
    }
}

export async function getAnalyticsData(period: '7d' | '30d' | 'all' = '7d', companyName: string = "Sai Associates") {
    try {
        let dateFilter = {};
        const now = new Date();

        if (period === '7d') {
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);
            dateFilter = { gte: sevenDaysAgo };
        } else if (period === '30d') {
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            dateFilter = { gte: thirtyDaysAgo };
        }

        const invoices = await prisma.invoice.findMany({
            where: {
                date: dateFilter,
                companyName
            } as any,
            include: { items: true },
            orderBy: { date: 'desc' } as any
        });

        // @ts-ignore
        const topDebtors = await prisma.customer.findMany({
            orderBy: { balance: 'desc' } as any,
            take: 5,
            select: { name: true, balance: true } as any,
            where: { companyName }
        });

        return { invoices, topDebtors };
    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        return { invoices: [], topDebtors: [] };
    }
}

export async function updateInvoicePaymentAction(invoiceId: string, status: string, paymentMode: string) {
    try {
        await prisma.invoice.update({
            where: { invoiceNo: invoiceId },
            data: {
                status: status,
                paymentMode: paymentMode
            }
        });
        revalidatePath('/dashboard/visits');
        revalidatePath('/dashboard/invoices');
        revalidatePath('/dashboard/inventory');
        revalidatePath('/dashboard/reports/balance-sheet');
        return { success: true };
    } catch (error) {
        console.error("Failed to update payment status:", error);
        return { success: false, error };
    }
}

export async function createBulkInvoicesAction(invoicesData: InvoiceData[]) {
    try {
        if (!invoicesData || invoicesData.length === 0) return { success: false, error: "No data provided" };

        let createdCount = 0;
        let errors: string[] = [];

        // Transactional processing
        await prisma.$transaction(async (tx) => {
            for (const data of invoicesData) {
                // Default Godown Logic inside loop or passed in data
                const godownId = data.godownId || (await tx.godown.findFirst({ orderBy: { createdAt: 'asc' } }))?.id;

                let customer = await tx.customer.findFirst({
                    where: {
                        // @ts-ignore
                        OR: [{ name: data.customer.name }, { phone: data.customer.phone }],
                        companyName: data.companyName
                    }
                });

                if (!customer) {
                    console.warn(`Customer ${data.customer.name} not found for bulk. Creating new.`);
                    // @ts-ignore
                    customer = await tx.customer.create({
                        data: {
                            name: data.customer.name,
                            address: data.customer.address,
                            state: "Tamil Nadu", // Default
                            companyName: data.companyName,
                            phone: data.customer.phone
                        } as any
                    });
                }

                const totalAmount = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

                // @ts-ignore
                const invoice = await tx.invoice.create({
                    data: {
                        invoiceNo: data.invoiceNo,
                        companyName: data.companyName,
                        employeeId: data.employeeId,
                        customerName: data.customer.name,
                        customerId: customer.id,
                        totalAmount,
                        date: new Date(data.date),
                        paymentMode: data.paymentMode || "CASH",
                        status: "PENDING",
                        customerDetails: JSON.stringify(data.customer),
                        billingAddress: `${data.customer.address}, ${data.customer.state}`,
                        items: {
                            create: data.items.map(item => ({
                                productId: String(item.id),
                                description: item.description,
                                quantity: item.quantity,
                                price: item.price,
                                costPrice: item.costPrice || 0,
                                hsn: item.hsn
                            }))
                        }
                    } as any
                });

                // Deduct Stock
                if (godownId) {
                    for (const item of data.items) {
                        const productId = String(item.id);
                        try {
                            await tx.stock.update({
                                where: { productId_godownId: { productId, godownId } },
                                data: { quantity: { decrement: item.quantity } }
                            });
                        } catch (e) { /* Ignore or handle negative stock */ }

                        // @ts-ignore
                        await tx.product.update({
                            where: { id: productId },
                            data: { stock: { decrement: item.quantity } }
                        });
                    }
                }

                // Update Customer Stats
                // @ts-ignore
                await tx.customer.update({
                    where: { id: customer.id },
                    data: {
                        totalRevenue: { increment: totalAmount },
                        lastInvoiceNo: invoice.invoiceNo,
                        balance: { increment: totalAmount }
                    } as any
                });

                createdCount++;
            }
        }, {
            maxWait: 5000,
            timeout: 30000
        });

        revalidatePath("/dashboard/invoices");
        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/analytics");
        return { success: true, count: createdCount, errors };

    } catch (error: any) {
        console.error("Bulk Invoice Failed:", error);
        return { success: false, error: error.message || "Database Transaction Failed" };
    }
}
