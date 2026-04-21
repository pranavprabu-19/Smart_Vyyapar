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


        // 5. Growth (Calculate from actual last month data)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const lastMonthResult = await prisma.invoice.aggregate({
            _sum: { totalAmount: true },
            where: {
                companyName,
                date: { gte: lastMonthStart, lte: lastMonthEnd },
                status: "PAID"
            }
        });

        const lastMonthRevenue = lastMonthResult._sum.totalAmount || 0;
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

        // 8. Low Stock Items (ML Sync)
        const { predictStockoutAction } = await import("@/actions/stock-prediction");
        const mlRes = await predictStockoutAction(companyName);
        let lowStockItems: any[] = [];
        
        if (mlRes.success && mlRes.predictions) {
            // Map ML "CRITICAL" and "LOW" status items into the dashboard format
            lowStockItems = mlRes.predictions
                .filter(p => p.status === 'CRITICAL' || p.status === 'LOW')
                .slice(0, 5)
                .map(p => ({
                    id: p.sku,
                    name: p.productName,
                    stock: p.currentStock,
                    price: 0 // price isn't strictly needed for the low stock widget
                }));
        }

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

export type SmartInsight = {
    id: string;
    type: "low_stock" | "outstanding" | "growth" | "top_product" | "trip" | "alert";
    title: string;
    description: string;
    value?: string;
    href?: string;
    severity?: "info" | "warning" | "success";
};

export async function getSmartInsights(companyName: string = "Sai Associates"): Promise<SmartInsight[]> {
    try {
        const insights: SmartInsight[] = [];
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { predictStockoutAction } = await import("@/actions/stock-prediction");
        const mlRes = await predictStockoutAction(companyName);
        let lowStock: any[] = [];
        if (mlRes.success && mlRes.predictions) {
            lowStock = mlRes.predictions
                .filter(p => p.status === 'CRITICAL')
                .slice(0, 5)
                .map(p => ({ id: p.sku, name: p.productName, stock: p.currentStock }));
        }

        const [outstanding, monthInvoices, activeTrips] = await Promise.all([
            prisma.customer.aggregate({
                _sum: { balance: true },
                _count: true,
                where: { companyName, balance: { gt: 0 } },
            }),
            prisma.invoice.aggregate({
                _sum: { totalAmount: true },
                where: { companyName, date: { gte: startOfMonth, lte: endOfMonth }, status: "PAID" },
            }),
            prisma.trip.count({ where: { companyName, status: "IN_PROGRESS" } }),
        ]);

        if (lowStock.length > 0) {
            insights.push({
                id: "low-stock",
                type: "low_stock",
                title: "Low stock alert",
                description: `${lowStock.length} item(s) below threshold. ${lowStock[0].name} has ${lowStock[0].stock} left.`,
                value: `${lowStock.length} items`,
                href: "/dashboard/inventory",
                severity: "warning",
            });
        }
        const totalOut = outstanding._sum.balance ?? 0;
        const custWithDebt = outstanding._count ?? 0;
        if (totalOut > 0) {
            insights.push({
                id: "outstanding",
                type: "outstanding",
                title: "Pending collections",
                description: `₹${totalOut.toLocaleString()} across ${custWithDebt} customer(s).`,
                value: `₹${(totalOut / 1000).toFixed(0)}k`,
                href: "/dashboard/customers",
                severity: "info",
            });
        }
        const rev = monthInvoices._sum.totalAmount ?? 0;
        if (rev > 0) {
            insights.push({
                id: "growth",
                type: "growth",
                title: "This month's revenue",
                description: `₹${rev.toLocaleString()} collected so far.`,
                value: `₹${(rev / 1000).toFixed(0)}k`,
                severity: "success",
            });
        }
        if (activeTrips > 0) {
            insights.push({
                id: "trips",
                type: "trip",
                title: "Active trips",
                description: `${activeTrips} trip(s) in progress.`,
                value: `${activeTrips}`,
                href: "/dashboard/trips",
                severity: "info",
            });
        }
        return insights;
    } catch (e) {
        console.error("getSmartInsights error:", e);
        return [];
    }
}

export type ActivityItem = {
    id: string;
    type: "invoice" | "photo" | "trip" | "customer";
    title: string;
    description?: string;
    timestamp: Date;
    href?: string;
};

export async function getRecentActivity(companyName: string = "Sai Associates", limit: number = 10): Promise<ActivityItem[]> {
    try {
        const [invoices, photos, trips] = await Promise.all([
            prisma.invoice.findMany({
                where: { companyName },
                take: limit,
                orderBy: { createdAt: "desc" },
                select: { id: true, invoiceNo: true, customerName: true, totalAmount: true, createdAt: true },
            }),
            prisma.photo.findMany({
                where: { companyName },
                take: Math.ceil(limit / 2),
                orderBy: { createdAt: "desc" },
                select: { id: true, userName: true, createdAt: true, address: true },
            }),
            prisma.trip.findMany({
                where: { companyName },
                take: Math.ceil(limit / 2),
                orderBy: { updatedAt: "desc" },
                select: { id: true, driverName: true, vehicleNo: true, status: true, updatedAt: true },
            }),
        ]);

        const items: ActivityItem[] = [];
        for (const i of invoices) {
            items.push({
                id: `inv-${i.id}`,
                type: "invoice",
                title: `Invoice #${i.invoiceNo}`,
                description: `${i.customerName} — ₹${i.totalAmount.toLocaleString()}`,
                timestamp: i.createdAt,
                href: "/dashboard/invoices",
            });
        }
        for (const p of photos) {
            items.push({
                id: `photo-${p.id}`,
                type: "photo",
                title: `Photo by ${p.userName}`,
                description: p.address ?? undefined,
                timestamp: p.createdAt,
                href: "/dashboard/photos",
            });
        }
        for (const t of trips) {
            items.push({
                id: `trip-${t.id}`,
                type: "trip",
                title: `Trip — ${t.driverName} (${t.vehicleNo})`,
                description: t.status,
                timestamp: t.updatedAt,
                href: "/dashboard/trips",
            });
        }
        items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return items.slice(0, limit);
    } catch (e) {
        console.error("getRecentActivity error:", e);
        return [];
    }
}

export type AnalyticsProPeriod = "today" | "this_week" | "this_month" | "this_quarter" | "this_year";

function getPeriodBounds(period: AnalyticsProPeriod) {
    const now = new Date();
    const start = new Date(now);

    if (period === "today") {
        start.setHours(0, 0, 0, 0);
    } else if (period === "this_week") {
        const day = now.getDay(); // 0..6
        const diff = day === 0 ? 6 : day - 1; // monday start
        start.setDate(now.getDate() - diff);
        start.setHours(0, 0, 0, 0);
    } else if (period === "this_month") {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
    } else if (period === "this_quarter") {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        start.setMonth(quarterStartMonth, 1);
        start.setHours(0, 0, 0, 0);
    } else {
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
    }

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return { start, end, prevStart, prevEnd };
}

export async function getAnalyticsProDataAction(period: AnalyticsProPeriod, companyName: string = "Sai Associates") {
    try {
        const { start, end, prevStart, prevEnd } = getPeriodBounds(period);
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [currentInvoices, prevInvoices, customers, products] = await Promise.all([
            prisma.invoice.findMany({
                where: { companyName, date: { gte: start, lte: end } },
                include: { items: true },
            }),
            prisma.invoice.findMany({
                where: { companyName, date: { gte: prevStart, lte: prevEnd } },
                include: { items: true },
            }),
            prisma.customer.findMany({
                where: { companyName },
                select: { id: true, name: true, balance: true, createdAt: true },
            }),
            prisma.product.findMany({
                where: { companyName },
                select: { stock: true, minStock: true, costPrice: true },
            }),
        ]);

        const sumAmount = (arr: typeof currentInvoices) => arr.reduce((s, i) => s + i.totalAmount, 0);
        const currentRevenue = sumAmount(currentInvoices);
        const prevRevenue = sumAmount(prevInvoices);
        const currentOrders = currentInvoices.length;
        const prevOrders = prevInvoices.length;

        const growth = (current: number, previous: number) => (previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0);

        const activeCustomerIds = new Set(
            currentInvoices.map((i) => i.customerId).filter((v): v is string => Boolean(v))
        );
        const newCustomers = customers.filter((c) => c.createdAt >= start && c.createdAt <= end).length;

        const outstanding = customers.reduce((s, c) => s + (c.balance || 0), 0);
        const overdue = currentInvoices
            .filter((i) => i.dueDate && i.dueDate < now && i.totalAmount > i.paidAmount)
            .reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
        const collectionRate = currentRevenue > 0 ? ((currentRevenue - overdue) / currentRevenue) * 100 : 100;

        const avgOrderCurrent = currentOrders > 0 ? currentRevenue / currentOrders : 0;
        const avgOrderPrev = prevOrders > 0 ? prevRevenue / prevOrders : 0;

        const inventoryValue = products.reduce((s, p) => s + p.stock * (p.costPrice || 0), 0);
        const lowStock = products.filter((p) => p.stock <= p.minStock).length;
        const deadStock = products.filter((p) => p.stock === 0).length;
        const turnover = inventoryValue > 0 ? currentRevenue / inventoryValue : 0;

        const days: { day: string; value: number }[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(sevenDaysAgo.getDate() + i);
            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(d);
            dayEnd.setHours(23, 59, 59, 999);
            const total = currentInvoices
                .filter((inv) => inv.date >= dayStart && inv.date <= dayEnd)
                .reduce((s, inv) => s + inv.totalAmount, 0);
            days.push({
                day: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
                value: total,
            });
        }

        const productAgg = new Map<string, { name: string; revenue: number; units: number }>();
        currentInvoices.forEach((inv) => {
            inv.items.forEach((it) => {
                const key = it.description;
                const prev = productAgg.get(key) || { name: key, revenue: 0, units: 0 };
                prev.revenue += it.price * it.quantity;
                prev.units += it.quantity;
                productAgg.set(key, prev);
            });
        });
        const topProducts = [...productAgg.values()]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map((p) => ({ ...p, growth: 0 }));

        const customerAgg = new Map<string, { name: string; revenue: number; orders: number; outstanding: number }>();
        currentInvoices.forEach((inv) => {
            const key = inv.customerId || inv.customerName;
            const prev = customerAgg.get(key) || { name: inv.customerName, revenue: 0, orders: 0, outstanding: 0 };
            prev.revenue += inv.totalAmount;
            prev.orders += 1;
            customerAgg.set(key, prev);
        });
        customers.forEach((c) => {
            const byId = customerAgg.get(c.id);
            if (byId) byId.outstanding = c.balance || 0;
        });
        const topCustomers = [...customerAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        return {
            success: true,
            exportIntent: "OPERATIONAL_SNAPSHOT",
            metrics: {
                revenue: { current: currentRevenue, previous: prevRevenue, growth: growth(currentRevenue, prevRevenue) },
                orders: { current: currentOrders, previous: prevOrders, growth: growth(currentOrders, prevOrders) },
                customers: { active: activeCustomerIds.size, new: newCustomers, churned: 0 },
                avgOrderValue: { current: avgOrderCurrent, previous: avgOrderPrev, growth: growth(avgOrderCurrent, avgOrderPrev) },
                collection: { rate: Math.max(0, Math.min(100, collectionRate)), outstanding, overdue },
                inventory: { turnover, lowStock, deadStock },
            },
            salesByDay: days,
            topProducts,
            topCustomers,
        };
    } catch (error) {
        console.error("getAnalyticsProDataAction failed:", error);
        return {
            success: false,
            exportIntent: "OPERATIONAL_SNAPSHOT",
            error: "Failed to load analytics data",
            metrics: {
                revenue: { current: 0, previous: 0, growth: 0 },
                orders: { current: 0, previous: 0, growth: 0 },
                customers: { active: 0, new: 0, churned: 0 },
                avgOrderValue: { current: 0, previous: 0, growth: 0 },
                collection: { rate: 0, outstanding: 0, overdue: 0 },
                inventory: { turnover: 0, lowStock: 0, deadStock: 0 },
            },
            salesByDay: [],
            topProducts: [],
            topCustomers: [],
        };
    }
}
