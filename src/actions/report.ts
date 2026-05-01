"use server";

import { prisma } from "@/lib/db";

// Types for returns
export interface HSNSummary {
    hsn: string;
    description: string;
    uqc: string;
    totalQty: number;
    totalValue: number;
    taxableValue: number;
    integratedTax: number;
    centralTax: number;
    stateTax: number;
    cess: number;
}

export interface B2BInvoice {
    gstin: string;
    invoiceNo: string;
    date: string;
    value: number;
    placeOfSupply: string;
    reverseCharge: string;
    invoiceType: string;
    taxRate: number;
    taxableValue: number;
}

export async function getGSTR1Data(month: number, year: number, companyName: string = "Sai Associates") {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const invoices = await prisma.invoice.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                companyName: companyName
            },
            include: {
                items: true,
                customer: true // If related in future, currently json
            }
        });

        const b2b: B2BInvoice[] = [];
        const b2cSmall: any[] = [];
        const hsnSummary: Record<string, HSNSummary> = {};

        for (const inv of invoices) {
            const customerGSTIN = (inv.customer as any).gstin;
            const isB2B = !!customerGSTIN;

            // Basic logic: if GSTIN present, B2B, else B2C
            if (isB2B) {
                b2b.push({
                    gstin: customerGSTIN,
                    invoiceNo: inv.invoiceNo,
                    date: inv.date.toISOString().split('T')[0],
                    value: Number(inv.totalAmount),
                    placeOfSupply: (inv.customer as any).state || "33-Tamil Nadu",
                    reverseCharge: "N",
                    invoiceType: "Regular",
                    taxRate: 18, // hardcoded for now or derived from items
                    taxableValue: Number(inv.totalAmount) / 1.18 // simplistic back-calculation for demo
                });
            } else {
                b2cSmall.push({
                    placeOfSupply: (inv.customer as any).state || "33-Tamil Nadu",
                    rate: 18,
                    taxableValue: Number(inv.totalAmount) / 1.18,
                    cess: 0
                });
            }

            // HSN Data Aggr
            for (const item of inv.items) {
                // In real DB, fetch product details if HSN not in item (currently item has basic info)
                // NOTE: InvoiceItem in Prisma schema needs checks.
                // Assuming item has hsn/code. If not, fallback.
                const hsn = (item as any).hsn || "8517";
                if (!hsnSummary[hsn]) {
                    hsnSummary[hsn] = {
                        hsn,
                        description: (item as any).description || "Goods",
                        uqc: (item as any).unit || "NOS",
                        totalQty: 0,
                        totalValue: 0,
                        taxableValue: 0,
                        integratedTax: 0,
                        centralTax: 0,
                        stateTax: 0,
                        cess: 0
                    };
                }
                const qty = (item as any).qty || (item as any).quantity || 1;
                const val = (item as any).price * qty;
                hsnSummary[hsn].totalQty += qty;
                hsnSummary[hsn].totalValue += val;
                hsnSummary[hsn].taxableValue += (val / 1.18);
                // Determine tax type based on state (mock logic: same state = CGST+SGST)
                const isInterState = false;
                if (isInterState) {
                    hsnSummary[hsn].integratedTax += (val / 1.18) * 0.18;
                } else {
                    hsnSummary[hsn].centralTax += (val / 1.18) * 0.09;
                    hsnSummary[hsn].stateTax += (val / 1.18) * 0.09;
                }
            }
        }

        return {
            success: true,
            b2b,
            b2cSmall,
            hsn: Object.values(hsnSummary),
            meta: {
                count: invoices.length,
                totalValue: invoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0)
            }
        };

    } catch (e) {
        console.error("GSTR1 Error", e);
        return { success: false, error: "Failed to generate GSTR1 data" };
    }
}
