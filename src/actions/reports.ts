"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from 'next/cache';

export interface BalanceSheetData {
    assets: {
        closingStock: number;
        receivables: number;
        cash: number;
        bank: number;
        fixed: number;
        totalCurrent: number;
        total: number;
    };
    liabilities: {
        sundryCreditors: number;
        gstPayable: number;
        bankLoan: number;
        pendingPayroll: number; // Added: Wages Payable
        totalCurrent: number;
        total: number;
    };
    equity: {
        capital: number;
        netProfit: number;
        total: number;
    };
    stockDetails: any[];
}

export async function getBalanceSheetReport(companyName: string = "Sai Associates"): Promise<{ success: boolean; data?: BalanceSheetData }> {
    noStore(); // Opt out of static caching
    try {
        // 1. Fetch Real Data

        // Products for Stock Valuation
        const products = await prisma.product.findMany({
            where: { companyName }
        });

        // Customers for Receivables
        const customers = await prisma.customer.findMany({
            where: { companyName }
        });

        // Pending Payroll for Liabilities
        const pendingPayroll = await prisma.payroll.findMany({
            where: {
                employee: { companyName },
                status: "PENDING"
            }
        });

        // 2. Calculations

        // A. Stock Value
        const closingStock = products.reduce((sum, p) => {
            const cost = Number(p.costPrice || (Number(p.price) * 0.7)); // Fallback if costPrice is 0
            return sum + (p.stock * cost);
        }, 0);

        // B. Receivables (Only positive balances)
        const receivables = customers.reduce((sum, c) => sum + Math.max(0, Number(c.balance)), 0);
        // For MVP we can assume balance is amount they OWE us.

        // C. Pending Wages
        const wagesPayable = pendingPayroll.reduce((sum, p) => sum + Number(p.netSalary), 0);

        // D. Simulated / Hardcoded Values (As we don't have full ledger yet)
        const cash = 45000;
        const bank = 125000;
        const fixed = 850000;

        // E. Simulated Liabilities
        const sundryCreditors = 150000; // Unpaid Bills to Suppliers
        const gstPayable = 25000;
        const bankLoan = 500000;

        // F. Totals
        const totalCurrentAssets = closingStock + receivables + cash + bank;
        const totalAssets = totalCurrentAssets + fixed;

        const totalCurrentLiabilities = sundryCreditors + gstPayable + wagesPayable;
        const totalLiabilities = totalCurrentLiabilities + bankLoan;

        // G. Equity (Balancing Figure)
        const capital = 1000000;
        // Assets = Liabilities + Equity
        // Equity = Assets - Liabilities
        const totalEquity = totalAssets - totalLiabilities;
        const netProfit = totalEquity - capital;

        return {
            success: true,
            data: {
                assets: {
                    closingStock,
                    receivables,
                    cash,
                    bank,
                    fixed,
                    totalCurrent: totalCurrentAssets,
                    total: totalAssets
                },
                liabilities: {
                    sundryCreditors,
                    gstPayable,
                    bankLoan,
                    pendingPayroll: wagesPayable,
                    totalCurrent: totalCurrentLiabilities,
                    total: totalLiabilities
                },
                equity: {
                    capital,
                    netProfit,
                    total: totalEquity
                },
                stockDetails: products.map(p => ({
                    sku: p.sku,
                    name: p.name,
                    stock: p.stock,
                    costPrice: Number(p.costPrice || (Number(p.price) * 0.7)),
                    totalValue: p.stock * Number(p.costPrice || (Number(p.price) * 0.7)),
                    minStock: p.minStock
                }))
            }
        };

    } catch (error) {
        console.error("Balance Sheet Error:", error);
        return { success: false, data: undefined };
    }
}
