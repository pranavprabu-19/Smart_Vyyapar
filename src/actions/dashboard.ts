"use server";

import { prisma } from "@/lib/db";
import { getGodownStatsAction } from "./godown";

export async function getDashboardMetrics(companyName: string = "Sai Associates") {
    try {
        // 1. Total Revenue (Current Month)
        // Since we don't have historical invoice data in seed, this will be 0 or based on what's added.
        // Let's query Invoices for the current month.
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const currentMonthInvoices = await prisma.invoice.aggregate({
            _sum: {
                totalAmount: true
            },
            where: {
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                },
                status: "PAID",
                companyName: companyName
            }
        });

        const currentMonthRevenue = currentMonthInvoices._sum.totalAmount || 0;

        // 2. Active Customers
        const customerCount = await prisma.customer.count({
            where: { companyName: companyName }
        });

        // 3. Pending Payments (Total Outstanding Balance)
        const outstanding = await prisma.customer.aggregate({
            _sum: {
                balance: true
            },
            where: { companyName: companyName }
        });
        const totalOutstanding = outstanding._sum.balance || 0;
        const customersWithDebt = await prisma.customer.count({
            where: {
                balance: { gt: 0 },
                companyName: companyName
            }
        });

        // 4. Stock Value
        // Calculate sum of (stock * price)
        // Prisma doesn't support multiplying fields in aggregate directly easily without raw query or fetching.
        // Fetching select fields is safer for now if dataset small, or use raw query.
        const products = await prisma.product.findMany({
            where: { companyName: companyName },
            select: {
                stock: true,
                price: true
            }
        });
        const totalStockValue = products.reduce((acc: number, p: { stock: number; price: number }) => acc + (p.stock * p.price), 0);
        const uniqueSkus = products.length;

        // 5. Growth (Mock logic for now since we lack history)
        // In real app, query last month same way.
        const lastMonthRevenue = 345000; // Hardcoded baseline for demo
        const growth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

        // 6. Chart Data (Last 7 Days)
        const weeklySales = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStart = new Date(d.setHours(0, 0, 0, 0));
            const dayEnd = new Date(d.setHours(23, 59, 59, 999));

            const dailyTotal = await prisma.invoice.aggregate({
                _sum: { totalAmount: true },
                where: {
                    date: { gte: dayStart, lte: dayEnd },
                    companyName: companyName
                }
            });
            weeklySales.push({
                name: days[dayStart.getDay()],
                total: dailyTotal._sum.totalAmount || 0
            });
        }

        // 7. Recent Transactions (for list)
        // We can fetch top 5 recent invoices
        const recentInvoices = await prisma.invoice.findMany({
            where: { companyName: companyName },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                invoiceNo: true,
                customerName: true,
                billingAddress: true,
                totalAmount: true,
            }
        });

        // 8. Low Stock Items (Threshold < 10)
        const lowStockItems = await prisma.product.findMany({
            where: {
                stock: { lt: 10 },
                companyName: companyName
            },
            take: 5,
            orderBy: { stock: 'asc' },
            select: {
                id: true,
                name: true,
                stock: true,
                price: true
            }
        });

        const recentSales = recentInvoices.map(inv => ({
            id: inv.id,
            name: inv.customerName,
            location: inv.billingAddress,
            amount: inv.totalAmount
        }));

        // 9. Godown Status (with error handling)
        let godownStats: any[] = [];
        try {
            const godownStatsRes = await getGodownStatsAction();
            godownStats = godownStatsRes.success ? godownStatsRes.stats : [];
        } catch (error) {
            console.warn("Godown stats not available:", error);
            godownStats = [];
        }

        // 10. Today's Sales Summary
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayInvoices = await prisma.invoice.findMany({
            where: {
                date: { gte: today, lte: todayEnd },
                companyName: companyName
            }
        });

        const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const todayInvoiceCount = todayInvoices.length;
        const todayCollections = todayInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.totalAmount, 0);

        // 11. Active Trips
        const activeTrips = await prisma.trip.count({
            where: {
                status: "IN_PROGRESS",
                companyName: companyName
            }
        });

        return {
            currentMonthRevenue,
            growth,
            customerCount,
            totalOutstanding,
            customersWithDebt,
            totalStockValue,
            uniqueSkus,
            weeklySales,
            recentSales,
            lowStockItems,
            godownStats,
            todaySales,
            todayInvoiceCount,
            todayCollections,
            activeTrips
        };

    } catch (error) {
        console.error("Error fetching dashboard metrics:", error);
        return {
            currentMonthRevenue: 0,
            growth: 0,
            customerCount: 0,
            totalOutstanding: 0,
            customersWithDebt: 0,
            totalStockValue: 0,
            uniqueSkus: 0,
            weeklySales: [],
            recentSales: [],
            lowStockItems: [],
            godownStats: [],
            todaySales: 0,
            todayInvoiceCount: 0,
            todayCollections: 0,
            activeTrips: 0
        };
    }
}
