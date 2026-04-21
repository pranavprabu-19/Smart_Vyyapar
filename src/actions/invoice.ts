"use server";

import { prisma } from "@/lib/db";
import { InvoiceData } from "@/lib/invoice-utils";
import { revalidatePath } from "next/cache";
import { getScopedCompanyName } from "@/lib/company-scope";
import { ensureDefaultGodownId } from "@/lib/default-godown";
import { syncCustomerCreditFromBalance } from "@/lib/customerCredit";

export async function createInvoiceAction(data: InvoiceData) {
    try {
        const scopedCompany = await getScopedCompanyName(data.companyName);
        const scopedData: InvoiceData = { ...data, companyName: scopedCompany };
        const totalAmount = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        // Default to Main Warehouse if not specified (should be handled by caller properly)
        const godownId =
            scopedData.godownId ||
            (await prisma.godown.findFirst({ orderBy: { createdAt: "asc" } }))?.id ||
            (await ensureDefaultGodownId());

        // 1. Transaction: Upsert Customer -> Create Invoice -> Update Customer Metrics
        const result = await prisma.$transaction(async (tx) => {
            const itemProductRefs = [...new Set(scopedData.items.map((item) => String(item.id)))];
            const matchedProducts = await tx.product.findMany({
                where: {
                    companyName: scopedData.companyName,
                    OR: [
                        { id: { in: itemProductRefs } },
                        { sku: { in: itemProductRefs } },
                    ],
                },
                select: { id: true, sku: true },
            });
            const productIdByRef = new Map<string, string>();
            matchedProducts.forEach((product) => {
                productIdByRef.set(product.id, product.id);
                productIdByRef.set(product.sku, product.id);
            });
            const missingProductRefs = itemProductRefs.filter((ref) => !productIdByRef.has(ref));
            if (missingProductRefs.length > 0) {
                throw new Error(`Missing products for invoice items: ${missingProductRefs.join(", ")}`);
            }

            let validEmployeeId: string | undefined = undefined;
            if (scopedData.employeeId) {
                const employee = await tx.employee.findFirst({
                    where: { id: scopedData.employeeId, companyName: scopedData.companyName },
                    select: { id: true },
                });
                if (employee) {
                    validEmployeeId = employee.id;
                } else {
                    console.warn(
                        `Ignoring invalid employeeId '${scopedData.employeeId}' for company '${scopedData.companyName}' during invoice create.`
                    );
                }
            }

            // Upsert Customer logic
            let customer = await tx.customer.findFirst({
                // @ts-ignore
                where: {
                    OR: [
                        { gstin: scopedData.customer.gstin ? scopedData.customer.gstin : undefined },
                        { phone: scopedData.customer.phone },
                        { name: scopedData.customer.name }
                    ].filter(Boolean) as any,
                    companyName: scopedData.companyName
                }
            });

            if (!customer) {
                // @ts-ignore
                customer = await tx.customer.create({
                    data: {
                        name: scopedData.customer.name,
                        address: scopedData.customer.address,
                        state: scopedData.customer.state,
                        gstin: scopedData.customer.gstin || undefined,
                        phone: scopedData.customer.phone,
                        email: scopedData.customer.email,
                        lat: scopedData.customer.lat,
                        lng: scopedData.customer.lng,
                        companyName: scopedData.companyName
                    } as any
                });
            }

            // Create Invoice linked to Customer
            // @ts-ignore
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNo: scopedData.invoiceNo,
                    companyName: scopedData.companyName,
                    employeeId: validEmployeeId,
                    customerName: scopedData.customer.name,
                    customerId: customer.id,
                    status: scopedData.status || "PENDING",
                    totalAmount: totalAmount,
                    date: new Date(scopedData.date),
                    paymentMode: scopedData.paymentMode || "CASH",
                    customerDetails: JSON.stringify(scopedData.customer),
                    billingAddress: `${scopedData.customer.address}, ${scopedData.customer.state}`,
                    items: {
                        create: scopedData.items.map(item => ({
                            productId: productIdByRef.get(String(item.id))!,
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
            for (const item of scopedData.items) {
                const productId = productIdByRef.get(String(item.id))!;
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
                    balance: scopedData.paymentMode === "CREDIT" ? { increment: totalAmount } : undefined,
                    lat: scopedData.customer.lat,
                    lng: scopedData.customer.lng
                } as any
            });

            await syncCustomerCreditFromBalance({
                customerId: customer.id,
                tx,
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

export async function updateInvoicePaymentAction(
    invoiceId: string,
    status: string,
    paymentMode: string,
    companyName?: string
) {
    try {
        const scopedCompany = await getScopedCompanyName(companyName);
        const invoice = await prisma.invoice.findUnique({
            where: { invoiceNo: invoiceId },
            select: { companyName: true },
        });
        if (!invoice) return { success: false, error: "Invoice not found" };
        if (invoice.companyName !== scopedCompany) {
            return { success: false, error: "Access denied: invoice does not belong to the selected company." };
        }
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

                const itemProductRefs = [...new Set(data.items.map((item) => String(item.id)))];
                const matchedProducts = await tx.product.findMany({
                    where: {
                        companyName: data.companyName,
                        OR: [
                            { id: { in: itemProductRefs } },
                            { sku: { in: itemProductRefs } },
                        ],
                    },
                    select: { id: true, sku: true },
                });
                const productIdByRef = new Map<string, string>();
                matchedProducts.forEach((product) => {
                    productIdByRef.set(product.id, product.id);
                    productIdByRef.set(product.sku, product.id);
                });
                const missingProductRefs = itemProductRefs.filter((ref) => !productIdByRef.has(ref));
                if (missingProductRefs.length > 0) {
                    throw new Error(`Missing products for invoice ${data.invoiceNo}: ${missingProductRefs.join(", ")}`);
                }

                let validEmployeeId: string | undefined = undefined;
                if (data.employeeId) {
                    const employee = await tx.employee.findFirst({
                        where: { id: data.employeeId, companyName: data.companyName },
                        select: { id: true },
                    });
                    if (employee) {
                        validEmployeeId = employee.id;
                    } else {
                        console.warn(
                            `Ignoring invalid employeeId '${data.employeeId}' for company '${data.companyName}' during bulk invoice create.`
                        );
                    }
                }

                let invoice;
                try {
                    // @ts-ignore
                    invoice = await tx.invoice.create({
                        data: {
                            invoiceNo: data.invoiceNo,
                            companyName: data.companyName,
                            employeeId: validEmployeeId,
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
                                    productId: productIdByRef.get(String(item.id))!,
                                    description: item.description,
                                    quantity: item.quantity,
                                    price: item.price,
                                    costPrice: item.costPrice || 0,
                                    hsn: item.hsn
                                }))
                            }
                        } as any
                    });
                } catch (err: any) {
                    if (err?.code === "P2003") {
                        const field = err?.meta?.field_name || "unknown_foreign_key";
                        throw new Error(
                            `FK error while creating invoice ${data.invoiceNo} (company=${data.companyName}, customerId=${customer.id}, employeeId=${validEmployeeId ?? "null"}): ${field}`
                        );
                    }
                    throw err;
                }

                // Deduct Stock
                if (godownId) {
                    for (const item of data.items) {
                        const productId = productIdByRef.get(String(item.id))!;
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
                        balance: data.paymentMode === "CREDIT" ? { increment: totalAmount } : undefined
                    } as any
                });

                await syncCustomerCreditFromBalance({
                    customerId: customer.id,
                    tx,
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
        console.error("Bulk Invoice Failed:", error, {
            code: error?.code,
            meta: error?.meta,
            stack: error?.stack
        });
        return { success: false, error: error.message || "Database Transaction Failed" };
    }
}
