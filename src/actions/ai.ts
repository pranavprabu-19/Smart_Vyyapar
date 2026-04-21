"use server";

import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Types for the AI Response
export interface AiResponse {
    text: string;
    data?: any;
    type: 'text' | 'table' | 'metric' | 'action' | 'chart' | 'insight';
    intent: string;
    // New fields for automation
    navigationPath?: string;
    actionType?: string;
    suggestions?: string[];
}

// Helper function to format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

// Helper function to get date range
function getDateRange(period: string): { start: Date; end: Date; label: string } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    let start = new Date(now);
    start.setHours(0, 0, 0, 0);
    let label = "today";

    switch (period) {
        case "yesterday":
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            label = "yesterday";
            break;
        case "this_week":
        case "week":
            start.setDate(start.getDate() - start.getDay());
            label = "this week";
            break;
        case "last_week":
            start.setDate(start.getDate() - start.getDay() - 7);
            end.setDate(end.getDate() - end.getDay() - 1);
            label = "last week";
            break;
        case "this_month":
        case "month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            label = "this month";
            break;
        case "last_month":
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end.setDate(0);
            label = "last month";
            break;
        case "this_year":
        case "year":
            start = new Date(now.getFullYear(), 0, 1);
            label = "this year";
            break;
        case "last_30_days":
        case "30_days":
            start.setDate(start.getDate() - 30);
            label = "last 30 days";
            break;
        case "last_7_days":
        case "7_days":
            start.setDate(start.getDate() - 7);
            label = "last 7 days";
            break;
    }

    return { start, end, label };
}

export async function processQuery(query: string, companyName: string): Promise<AiResponse> {
    const q = query.toLowerCase();

    try {
        // --- PRIORITY 1: LOCAL AUTOMATION (No API Cost) ---
        // Handles navigation and actions instantly to bypass rate limits
        const navRegex = /^(go to|open|navigate to|show me|take me to)\s+(.+)$/i;
        const createRegex = /^(create|add|new|start)\s+(.+)$/i;

        if (navRegex.test(q) || createRegex.test(q)) {
            const createMatch = q.match(createRegex);
            const navMatch = q.match(navRegex);
            const target = (createMatch ? createMatch[2] : navMatch?.[2] || "").trim();

            // Check for ACTIONS first
            if (createRegex.test(q)) {
                if (target.includes("invoice") || target.includes("bill")) {
                    return {
                        text: "Opening new invoice...",
                        type: 'action',
                        intent: 'ACTION',
                        actionType: 'CREATE_INVOICE'
                    };
                }
                if (q.includes("trip") || q.includes("delivery")) {
                    return {
                        text: "Opening trip creation...",
                        type: 'action',
                        intent: 'ACTION',
                        actionType: 'CREATE_TRIP'
                    };
                }
                if (q.includes("customer")) {
                    return {
                        text: "Opening add customer...",
                        type: 'action',
                        intent: 'ACTION',
                        actionType: 'ADD_CUSTOMER'
                    };
                }
            }

            // Then Navigation
            let path = "/dashboard";
            if (q.includes("inventory") || q.includes("product") || q.includes("stock") || q.includes("item")) path = "/dashboard/inventory";
            else if (q.includes("invoice") || q.includes("bill") || q.includes("sale")) path = "/dashboard/invoices";
            else if (q.includes("trip") || q.includes("delivery") || q.includes("route")) path = "/dashboard/trips";
            else if (q.includes("photo") || q.includes("image") || q.includes("site")) path = "/dashboard/photos";
            else if (q.includes("setting") || q.includes("config") || q.includes("profile")) path = "/dashboard/settings";
            else if (q.includes("report") || q.includes("analytic") || q.includes("chart")) path = "/dashboard/analytics";
            else if (q.includes("customer") || q.includes("client") || q.includes("part")) path = "/dashboard/customers";
            else if (q.includes("attendance") || q.includes("staff")) path = "/dashboard/attendance";
            else if (q.includes("payroll") || q.includes("salary")) path = "/dashboard/payroll";

            return {
                text: `Navigating to ${path}...`,
                type: 'action',
                intent: 'NAVIGATE',
                navigationPath: path
            };
        }
        // === ENHANCED BUSINESS ANALYSIS ===

        // --- PROFIT ANALYSIS ---
        if (q.includes("profit") || q.includes("margin") || q.includes("earnings") || q.includes("profitability")) {
            let period = "this_month";
            if (q.includes("today")) period = "today";
            else if (q.includes("yesterday")) period = "yesterday";
            else if (q.includes("week")) period = "this_week";
            else if (q.includes("year")) period = "this_year";

            const { start, end, label } = getDateRange(period);

            const invoices = await prisma.invoice.findMany({
                where: { companyName, date: { gte: start, lte: end } },
                include: { items: true }
            });

            // Get product details for cost calculation
            const productIds = Array.from(new Set(invoices.flatMap(inv => inv.items.map(i => i.productId))));
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } }
            });
            const productMap = new Map(products.map(p => [p.id, p]));

            let totalRevenue = 0;
            let totalCost = 0;

            invoices.forEach(inv => {
                totalRevenue += inv.totalAmount;
                inv.items.forEach(item => {
                    const product = productMap.get(item.productId);
                    // Use product cost price if available, else 70% of sales price as heuristic
                    const costPrice = product?.costPrice || (item.price * 0.7);
                    totalCost += costPrice * item.quantity;
                });
            });

            const grossProfit = totalRevenue - totalCost;
            const marginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

            return {
                text: `📊 Profitability Analysis for ${label}:\n\n` +
                    `• Revenue: ${formatCurrency(totalRevenue)}\n` +
                    `• Cost of Goods: ${formatCurrency(totalCost)}\n` +
                    `• Gross Profit: ${formatCurrency(grossProfit)}\n` +
                    `• Margin: ${marginPercent}%\n\n` +
                    `${Number(marginPercent) >= 25 ? "✅ Healthy margins!" : "⚠️ Consider reviewing pricing strategy."}`,
                data: { revenue: totalRevenue, cost: totalCost, profit: grossProfit, margin: marginPercent },
                type: 'insight',
                intent: 'PROFIT_ANALYSIS',
                suggestions: ["Show top profitable products", "Compare with last month"]
            };
        }

        // --- GST ANALYSIS ---
        if (q.includes("gst") || q.includes("tax") || q.includes("gstr")) {
            let period = "this_month";
            if (q.includes("last month")) period = "last_month";
            else if (q.includes("quarter") || q.includes("3 month")) period = "this_quarter";

            const { start, end, label } = getDateRange(period);

            const invoices = await prisma.invoice.findMany({
                where: { companyName, date: { gte: start, lte: end } }
            });

            let totalTaxableAmount = 0;
            let totalCGST = 0;
            let totalSGST = 0;
            let totalIGST = 0;

            invoices.forEach(inv => {
                const taxable = inv.totalAmount / 1.18; // Assuming 18% GST
                totalTaxableAmount += taxable;
                // For simplicity, split evenly between CGST/SGST (intra-state)
                const gst = inv.totalAmount - taxable;
                totalCGST += gst / 2;
                totalSGST += gst / 2;
            });

            return {
                text: `🧾 GST Summary for ${label}:\n\n` +
                    `• Taxable Value: ${formatCurrency(totalTaxableAmount)}\n` +
                    `• CGST (9%): ${formatCurrency(totalCGST)}\n` +
                    `• SGST (9%): ${formatCurrency(totalSGST)}\n` +
                    `• Total Tax Collected: ${formatCurrency(totalCGST + totalSGST)}\n` +
                    `• Total Invoices: ${invoices.length}\n\n` +
                    `💡 Ensure timely GSTR-1 filing by 11th of next month.`,
                data: { taxable: totalTaxableAmount, cgst: totalCGST, sgst: totalSGST, invoiceCount: invoices.length },
                type: 'insight',
                intent: 'GST_ANALYSIS',
                suggestions: ["Export GSTR-1 data", "Show HSN-wise summary"]
            };
        }

        // --- TOP PRODUCTS ANALYSIS ---
        if (q.includes("top product") || q.includes("best seller") || q.includes("most sold") || q.includes("popular item")) {
            let period = "this_month";
            if (q.includes("today")) period = "today";
            else if (q.includes("week")) period = "this_week";

            const { start, end, label } = getDateRange(period);

            // Group by product and sum quantities (InvoiceItem doesn't have 'total' stored)
            const topProducts = await prisma.invoiceItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true },
                where: {
                    invoice: { companyName, date: { gte: start, lte: end } }
                },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5
            });

            const productIds = topProducts.map(p => p.productId);
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } }
            });

            const productMap = Object.fromEntries(products.map(p => [p.id, p]));

            // Calculate revenue estimates (since we rely on grouped quantity)
            // Note: This is an approximation using current product price. 
            // For exact historical revenue, we'd need to sum (item.price * item.quantity).
            const results = topProducts.map(p => {
                const product = productMap[p.productId];
                const qty = p._sum.quantity || 0;
                const revenue = product ? (product.price * qty) : 0;

                return {
                    name: product?.name || 'Unknown',
                    qty: qty,
                    revenue: revenue
                };
            });

            return {
                text: `🏆 Top 5 Products for ${label}:\n\n` +
                    results.map((p, i) => `${i + 1}. ${p.name}\n   • Qty Sold: ${p.qty}\n   • Revenue: ${formatCurrency(p.revenue)}`).join("\n\n"),
                data: results,
                type: 'table',
                intent: 'TOP_PRODUCTS',
                suggestions: ["Show slow-moving items", "Compare with last month"]
            };
        }

        // --- CUSTOMER ANALYTICS ---
        if (q.includes("top customer") || q.includes("best customer") || q.includes("customer ranking") || q.includes("customer analysis")) {
            let period = "this_month";
            if (q.includes("year")) period = "this_year";

            const { start, end, label } = getDateRange(period);

            const topCustomers = await prisma.invoice.groupBy({
                by: ['customerId'],
                _sum: { totalAmount: true },
                _count: { id: true },
                where: {
                    companyName,
                    date: { gte: start, lte: end },
                    customerId: { not: null }
                },
                orderBy: { _sum: { totalAmount: 'desc' } },
                take: 5
            });

            const customerIds = topCustomers
                .map(c => c.customerId)
                .filter((id): id is string => id !== null);

            const customers = await prisma.customer.findMany({
                where: { id: { in: customerIds } }
            });

            const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

            const results = topCustomers.map(c => {
                if (!c.customerId) return null;
                const customer = customerMap[c.customerId];
                return {
                    name: customer?.name || 'Unknown',
                    orders: c._count.id || 0,
                    revenue: c._sum.totalAmount || 0,
                    outstanding: customer?.balance || 0
                };
            }).filter((r): r is NonNullable<typeof r> => r !== null);

            return {
                text: `👥 Top 5 Customers for ${label}:\n\n` +
                    results.map((c, i) => `${i + 1}. ${c.name}\n   • Orders: ${c.orders}\n   • Revenue: ${formatCurrency(c.revenue)}\n   • Outstanding: ${formatCurrency(c.outstanding)}`).join("\n\n"),
                data: results,
                type: 'table',
                intent: 'TOP_CUSTOMERS',
                suggestions: ["Show customers with high dues", "Analyze customer segments"]
            };
        }

        // --- COMPARISON / TREND ANALYSIS ---
        if (q.includes("compare") || q.includes("trend") || q.includes("growth") || q.includes("vs") || q.includes("versus")) {
            const thisMonth = getDateRange("this_month");
            const lastMonth = getDateRange("last_month");

            const [currentSales, previousSales] = await Promise.all([
                prisma.invoice.aggregate({
                    _sum: { totalAmount: true },
                    _count: { id: true },
                    where: { companyName, date: { gte: thisMonth.start, lte: thisMonth.end } }
                }),
                prisma.invoice.aggregate({
                    _sum: { totalAmount: true },
                    _count: { id: true },
                    where: { companyName, date: { gte: lastMonth.start, lte: lastMonth.end } }
                })
            ]);

            const current = currentSales._sum.totalAmount || 0;
            const previous = previousSales._sum.totalAmount || 0;
            const growth = previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : 0;
            const isGrowth = Number(growth) >= 0;

            return {
                text: `📈 Month-over-Month Comparison:\n\n` +
                    `• This Month: ${formatCurrency(current)} (${currentSales._count.id} orders)\n` +
                    `• Last Month: ${formatCurrency(previous)} (${previousSales._count.id} orders)\n` +
                    `• Growth: ${isGrowth ? '+' : ''}${growth}%\n\n` +
                    `${isGrowth ? (Number(growth) > 10 ? "🚀 Excellent growth!" : "✅ Positive trend!") : "⚠️ Sales declined. Review marketing strategy."}`,
                data: { current, previous, growth, currentOrders: currentSales._count.id, previousOrders: previousSales._count.id },
                type: 'insight',
                intent: 'TREND_ANALYSIS',
                suggestions: ["Show weekly breakdown", "Compare product-wise"]
            };
        }

        // --- CASH FLOW ANALYSIS ---
        if (q.includes("cash flow") || q.includes("collection") || q.includes("receivable") || q.includes("payment received")) {
            const { start, end, label } = getDateRange("this_month");

            const [totalSales, totalCollected, totalOutstanding] = await Promise.all([
                prisma.invoice.aggregate({
                    _sum: { totalAmount: true },
                    where: { companyName, date: { gte: start, lte: end } }
                }),
                prisma.payment.aggregate({
                    _sum: { amount: true },
                    where: { companyName, collectedAt: { gte: start, lte: end } }
                }),
                prisma.customer.aggregate({
                    _sum: { balance: true },
                    where: { companyName, balance: { gt: 0 } }
                })
            ]);

            const sales = totalSales._sum.totalAmount || 0;
            const collected = totalCollected._sum.amount || 0;
            const outstanding = totalOutstanding._sum.balance || 0;
            const collectionRate = sales > 0 ? ((collected / sales) * 100).toFixed(1) : 100;

            return {
                text: `💰 Cash Flow Analysis for ${label}:\n\n` +
                    `• Total Sales: ${formatCurrency(sales)}\n` +
                    `• Collections: ${formatCurrency(collected)}\n` +
                    `• Collection Rate: ${collectionRate}%\n` +
                    `• Total Outstanding: ${formatCurrency(outstanding)}\n\n` +
                    `${Number(collectionRate) >= 80 ? "✅ Good collection efficiency!" : "⚠️ Focus on collection follow-ups."}`,
                data: { sales, collected, outstanding, collectionRate },
                type: 'insight',
                intent: 'CASH_FLOW',
                suggestions: ["Show overdue invoices", "Send payment reminders"]
            };
        }

        // --- FORECASTING ---
        if (q.includes("forecast") || q.includes("predict sales") || q.includes("expected") || q.includes("projection")) {
            // Get last 3 months data for simple linear projection
            const months = [];
            for (let i = 2; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const start = new Date(d.getFullYear(), d.getMonth(), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                months.push({ start, end, label: start.toLocaleDateString('en-IN', { month: 'short' }) });
            }

            const salesData = await Promise.all(
                months.map(m =>
                    prisma.invoice.aggregate({
                        _sum: { totalAmount: true },
                        where: { companyName, date: { gte: m.start, lte: m.end } }
                    })
                )
            );

            const values = salesData.map(s => s._sum.totalAmount || 0);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const trend = values.length >= 2 ? (values[values.length - 1] - values[0]) / values.length : 0;
            const forecast = Math.max(0, avg + trend);

            return {
                text: `🔮 Sales Forecast:\n\n` +
                    `Past 3 months:\n` +
                    months.map((m, i) => `• ${m.label}: ${formatCurrency(values[i])}`).join("\n") +
                    `\n\n📊 Next Month Projection: ${formatCurrency(forecast)}\n` +
                    `(Based on ${trend >= 0 ? 'positive' : 'declining'} trend)\n\n` +
                    `💡 ${trend >= 0 ? "Maintain momentum with consistent operations." : "Consider promotional activities to boost sales."}`,
                data: { history: months.map((m, i) => ({ month: m.label, value: values[i] })), forecast, trend },
                type: 'insight',
                intent: 'FORECAST',
                suggestions: ["Show product-wise forecast", "View seasonal trends"]
            };
        }

        // --- BUSINESS HEALTH SCORE ---
        if (q.includes("health") || q.includes("score") || q.includes("status") || q.includes("overview") || q.includes("summary")) {
            const { start, end } = getDateRange("this_month");

            const [sales, outstanding, lowStock, activeCustomers] = await Promise.all([
                prisma.invoice.aggregate({
                    _sum: { totalAmount: true },
                    _count: { id: true },
                    where: { companyName, date: { gte: start, lte: end } }
                }),
                prisma.customer.aggregate({
                    _sum: { balance: true },
                    _count: { id: true },
                    where: { companyName, balance: { gt: 0 } }
                }),
                prisma.product.count({
                    where: { companyName, stock: { lte: 10 } }
                }),
                prisma.customer.count({
                    where: { companyName }
                })
            ]);

            const revenue = sales._sum.totalAmount || 0;
            const debt = outstanding._sum.balance || 0;
            const debtRatio = revenue > 0 ? (debt / revenue) * 100 : 0;

            // Calculate health score (0-100)
            let healthScore = 100;
            if (debtRatio > 50) healthScore -= 30;
            else if (debtRatio > 25) healthScore -= 15;
            if (lowStock > 5) healthScore -= 20;
            else if (lowStock > 2) healthScore -= 10;
            if (sales._count.id < 10) healthScore -= 20;

            const status = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Needs Attention";

            return {
                text: `🏥 Business Health Score: ${healthScore}/100 (${status})\n\n` +
                    `📊 Key Metrics This Month:\n` +
                    `• Revenue: ${formatCurrency(revenue)}\n` +
                    `• Orders: ${sales._count.id}\n` +
                    `• Outstanding: ${formatCurrency(debt)} (${debtRatio.toFixed(1)}% of revenue)\n` +
                    `• Low Stock Items: ${lowStock}\n` +
                    `• Total Customers: ${activeCustomers}\n\n` +
                    `${healthScore >= 80 ? "🌟 Your business is thriving!" : healthScore >= 60 ? "👍 Business is stable. Keep pushing!" : "⚠️ Review operations and follow up on collections."}`,
                data: { healthScore, status, revenue, orders: sales._count.id, outstanding: debt, lowStock, customers: activeCustomers },
                type: 'insight',
                intent: 'HEALTH_SCORE',
                suggestions: ["Show detailed breakdown", "Get improvement suggestions"]
            };
        }

        // --- ORIGINAL SALES INTENT (enhanced) ---
        if (q.includes("sales") || q.includes("revenue") || q.includes("income") || q.includes("sold")) {
            let period = "today";
            if (q.includes("yesterday")) period = "yesterday";
            else if (q.includes("week")) period = "this_week";
            else if (q.includes("month")) period = "this_month";
            else if (q.includes("year")) period = "this_year";

            const { start, end, label } = getDateRange(period);

            const result = await prisma.invoice.aggregate({
                _sum: { totalAmount: true },
                _count: { id: true },
                where: {
                    companyName,
                    date: { gte: start, lte: end }
                }
            });

            const total = result._sum.totalAmount || 0;
            const count = result._count.id || 0;
            const avgOrder = count > 0 ? total / count : 0;

            return {
                text: `📊 Sales for ${label}:\n\n` +
                    `• Total Revenue: ${formatCurrency(total)}\n` +
                    `• Orders: ${count}\n` +
                    `• Average Order: ${formatCurrency(avgOrder)}`,
                data: { total, count, average: avgOrder },
                type: 'metric',
                intent: 'SALES_METRIC',
                suggestions: ["Compare with last period", "Show top products"]
            };
        }



        // --- INTENT: SMART INVENTORY & PREDICTIONS (Local "AI" Heuristic) ---
        if (q.includes("predict") || q.includes("reorder") || q.includes("smart inventory") || q.includes("insight")) {
            const products = await prisma.product.findMany({
                where: { companyName, stock: { lte: 50 } }, // Broader look at inventory
                orderBy: { stock: 'asc' },
                take: 5
            });

            if (products.length === 0) {
                return {
                    text: "✨ Smart Inventory Scan: All stock levels look healthy! No immediate reorders predicted.",
                    type: 'text',
                    intent: 'INSIGHT_STOCK'
                };
            }

            // Realistic Prediction based on stock and minStock
            const insights = products.map(p => {
                // Heuristic: If stock is low, guess daily usage based on typical business (1-5 units)
                // In a real app, we would sum last 7 days sales and divide by 7
                const estimatedDailySales = p.stock < p.minStock ? 3 : 1.5;
                const daysLeft = Math.floor(p.stock / estimatedDailySales);

                return {
                    name: p.name,
                    stock: p.stock,
                    daysLeft: daysLeft <= 2 ? 'CRITICAL' : `${daysLeft} days`,
                    recommendation: daysLeft <= 5 ? `Order ${p.reorderQuantity} units today` : 'Monitor'
                };
            });

            return {
                text: `🔮 Smart Inventory Analysis: ${insights.filter(i => i.daysLeft === 'CRITICAL').length} items are at critical levels. Recommendations generated.`,
                data: insights,
                type: 'table',
                intent: 'INSIGHT_STOCK'
            };
        }

        // --- INTENT 2: LOW STOCK ---
        if (q.includes("low") || q.includes("stock") || q.includes("restock")) {
            const lowStockItems = await prisma.product.findMany({
                where: {
                    companyName,
                    stock: { lte: 20 } // Threshold
                },
                take: 5,
                orderBy: { stock: 'asc' }
            });

            if (lowStockItems.length === 0) {
                return {
                    text: "Your inventory looks healthy! No items are currently low in stock.",
                    type: 'text',
                    intent: 'STOCK_CHECK'
                };
            }

            const list = lowStockItems.map(i => `${i.name} (${i.stock} left)`).join("\n");
            return {
                text: `I found ${lowStockItems.length} items running low:\n${list}`,
                data: lowStockItems,
                type: 'table', // UI can render this nicely
                intent: 'STOCK_LOW'
            };
        }

        // --- INTENT 3: TOP CUSTOMERS / DUES ---
        if (query.includes("owe") || query.includes("due") || query.includes("pending")) {
            const debtors = await prisma.customer.findMany({
                where: {
                    companyName,
                    balance: { gt: 0 }
                },
                take: 5,
                orderBy: { balance: 'desc' }
            });

            if (debtors.length === 0) {
                return {
                    text: "Great news! You have no pending payments from customers.",
                    type: 'text',
                    intent: 'CUSTOMER_DEBT'
                };
            }

            const list = debtors.map(c => `${c.name}: ₹${c.balance}`).join("\n");
            return {
                text: `Here are the top customers with pending payments:\n${list}`,
                data: debtors,
                type: 'text',
                intent: 'CUSTOMER_DEBT'
            };
        }

        // --- INTENT 4: GREETING ---
        if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
            return {
                text: "Hello! I am your SmartVyapar assistant. Ask me about sales, stock, or payments.",
                type: 'text',
                intent: 'GREETING'
            };
        }

        // --- FALLBACK: Use Gemini ---
        try {
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `
            You are a smart business assistant for "SmartVyapar". The user asks: "${query}".
            Classify the intent into one of these exact strings: "SALES_METRIC", "STOCK_CHECK", "CUSTOMER_DEBT", "GREETING", "NAVIGATE", "ACTION", "UNKNOWN".
            
            Based on the intent, extract parameters in JSON format.
            - For NAVIGATE: { "path": "/dashboard/..." } (Infer the best matching path from user query e.g., "trips" -> "/dashboard/trips", "add user" -> "/dashboard/settings/users" (guess), "inventory" -> "/dashboard/inventory")
            - For ACTION: { "action": "CREATE_INVOICE" | "CREATE_TRIP", "data": {} }
            - For SALES_METRIC: { "period": "today" | "yesterday" | "this_month" | "last_30_days" }
            - For STOCK_CHECK: { "threshold": number (default 20) }
            - For CUSTOMER_DEBT: {}
            
            Return ONLY the JSON object with keys: "intent", "parameters".
            Example: { "intent": "NAVIGATE", "parameters": { "path": "/dashboard/inventory" } }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Clean markdown code blocks if any
            const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(cleanedText);

            // [NEW] Dispatch based on Automation Intents
            if (aiData.intent === 'NAVIGATE') {
                return {
                    text: `Navigating to ${aiData.parameters.path}...`,
                    type: 'action',
                    intent: 'NAVIGATE',
                    navigationPath: aiData.parameters.path
                };
            }

            if (aiData.intent === 'ACTION') {
                return {
                    text: `Opening ${aiData.parameters.action.replace('_', ' ')}...`,
                    type: 'action',
                    intent: 'ACTION',
                    actionType: aiData.parameters.action
                };
            }

            // Existing Gemini Dispatch
            if (aiData.intent === 'SALES_METRIC') {
                const now = new Date();
                let start = new Date(now.setHours(0, 0, 0, 0));
                let end = new Date(now.setHours(23, 59, 59, 999));
                const period = aiData.parameters.period || 'today';

                if (period === 'yesterday') {
                    start.setDate(start.getDate() - 1);
                    end.setDate(end.getDate() - 1);
                } else if (period === 'this_month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                }

                const result = await prisma.invoice.aggregate({
                    _sum: { totalAmount: true },
                    _count: { id: true },
                    where: { companyName, date: { gte: start, lte: end } }
                });

                return {
                    text: `(AI) Total sales for ${period}: ₹${(result._sum.totalAmount || 0).toLocaleString()} (${result._count.id} orders).`,
                    data: result,
                    type: 'metric',
                    intent: 'SALES_METRIC'
                };
            }

            if (aiData.intent === 'STOCK_CHECK') {
                const lowStockItems = await prisma.product.findMany({
                    where: { companyName, stock: { lte: aiData.parameters.threshold || 20 } },
                    take: 5,
                    orderBy: { stock: 'asc' }
                });
                if (lowStockItems.length === 0) return { text: "Stock looks good!", type: 'text', intent: 'STOCK_CHECK' };

                const list = lowStockItems.map(i => `${i.name} (${i.stock} left)`).join("\n");
                return {
                    text: `(AI) Found items running low (threshold ${aiData.parameters.threshold || 20}):\n${list}`,
                    data: lowStockItems,
                    type: 'table',
                    intent: 'STOCK_LOW'
                };
            }

            if (aiData.intent === 'CUSTOMER_DEBT') {
                const debtors = await prisma.customer.findMany({
                    where: { companyName, balance: { gt: 0 } },
                    take: 5, orderBy: { balance: 'desc' }
                });
                if (debtors.length === 0) return { text: "No pending payments found.", type: 'text', intent: 'CUSTOMER_DEBT' };
                const list = debtors.map(c => `${c.name}: ₹${c.balance}`).join("\n");
                return {
                    text: `(AI) Top pending payments:\n${list}`,
                    data: debtors,
                    type: 'text',
                    intent: 'CUSTOMER_DEBT'
                };
            }

            if (aiData.intent === 'GREETING') {
                return { text: "Hello! I'm capable of understanding complex queries now. Try me!", type: 'text', intent: 'GREETING' };
            }

        } catch (geminiError) {
            console.error("Gemini Fallback Error:", geminiError);
        }

        return {
            text: "I'm not sure I understand. Try asking 'How are sales today?' or 'What is low in stock?'",
            type: 'text',
            intent: 'UNKNOWN'
        };

    } catch (e) {
        console.error("AI Error:", e);
        return {
            text: "I encountered an error processing your request. Please try again.",
            type: 'text',
            intent: 'ERROR'
        };
    }
}
