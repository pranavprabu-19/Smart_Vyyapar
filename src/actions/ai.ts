"use server";

import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Types for the AI Response
export interface AiResponse {
    text: string;
    data?: any;
    type: 'text' | 'table' | 'metric' | 'action';
    intent: string;
    // New fields for automation
    navigationPath?: string;
    actionType?: string;
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
        if (q.includes("sales") || q.includes("revenue") || q.includes("income") || q.includes("sold")) {
            const now = new Date();
            let start = new Date(now.setHours(0, 0, 0, 0));
            let end = new Date(now.setHours(23, 59, 59, 999));
            let periodText = "today";

            if (q.includes("yesterday")) {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
                periodText = "yesterday";
            } else if (q.includes("month") || q.includes("this month")) {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                periodText = "this month";
            }

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

            return {
                text: `Total sales for ${periodText} is ₹${total.toLocaleString()} from ${count} invoices.`,
                data: { total, count },
                type: 'metric',
                intent: 'SALES_METRIC'
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
