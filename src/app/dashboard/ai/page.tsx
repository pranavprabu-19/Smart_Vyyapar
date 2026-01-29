"use client";

import { useEffect, useState, useRef } from "react";
import { Sparkles, TrendingUp, AlertTriangle, Users, ArrowRight, Zap, Target, History } from "lucide-react";
import { ChatInterface, ChatInterfaceRef } from "@/components/dashboard/chat-interface";
import { Card, CardContent } from "@/components/ui/card";
import { useCompany } from "@/lib/company-context";
import { getDashboardMetrics } from "@/actions/dashboard";
import { PageShell } from "@/components/dashboard/page-shell";

export default function AiDashboardPage() {
    const { currentCompany } = useCompany();
    const [pulse, setPulse] = useState<any>(null);
    const [isPulseLoading, setIsPulseLoading] = useState(true);
    const chatRef = useRef<ChatInterfaceRef>(null);

    useEffect(() => {
        const loadPulse = async () => {
            setIsPulseLoading(true);
            try {
                const metrics = await getDashboardMetrics(currentCompany);
                setPulse(metrics);
            } catch (error) {
                console.error("Failed to load pulse:", error);
            } finally {
                setIsPulseLoading(false);
            }
        };
        loadPulse();
    }, [currentCompany]);

    const suggestions = [
        "How were sales today?",
        "Predict low stock items",
        "Who owes me money?",
        "Show revenue trend",
        "Create new invoice",
        "Open trip sheets",
        "Add new customer"
    ];

    return (
        <PageShell title="AI Command Center" description="Conversational business intelligence and automation.">
            <div className="flex flex-col h-[calc(100vh-180px)] gap-6">

                {/* Top - Pulse Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 overflow-hidden relative group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <TrendingUp size={100} />
                        </div>
                        <CardContent className="p-6 relative">
                            <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
                                <Zap className="h-4 w-4" /> REVENUE PULSE
                            </p>
                            <h3 className="text-3xl font-bold mt-2">
                                {isPulseLoading ? "..." : `₹${pulse?.currentMonthRevenue?.toLocaleString() || 0}`}
                            </h3>
                            <p className="text-xs text-blue-200 mt-1">This Month • +{pulse?.growth?.toFixed(1)}%</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" /> STOCK WARNINGS
                                </p>
                                <h3 className="text-2xl font-bold mt-1">
                                    {isPulseLoading ? "..." : pulse?.lowStockItems?.length || 0}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">Items below threshold</p>
                            </div>
                            <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                                <AlertTriangle />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-sm flex items-center gap-2">
                                    <Users className="h-4 w-4 text-emerald-500" /> PENDING DUES
                                </p>
                                <h3 className="text-2xl font-bold mt-1">
                                    {isPulseLoading ? "..." : `₹${pulse?.totalOutstanding?.toLocaleString() || 0}`}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">From {pulse?.customersWithDebt || 0} customers</p>
                            </div>
                            <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                <Users />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-1 gap-6 overflow-hidden">
                    {/* Left - Chat Interface */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <Card className="flex-1 border-0 shadow-xl overflow-hidden rounded-2xl">
                            <ChatInterface
                                ref={chatRef}
                                className="h-full"
                                title="Smart Intelligence"
                                subtitle="Connected to Database & Local ML"
                            />
                        </Card>
                    </div>

                    {/* Right - Suggestions & Info */}
                    <div className="w-80 hidden lg:flex flex-col gap-6 shrink-0">
                        <Card className="bg-slate-50 border-0 shadow-sm">
                            <CardContent className="p-6">
                                <h4 className="font-bold text-sm flex items-center gap-2 mb-4">
                                    <Target className="h-4 w-4 text-blue-600" /> SMART SUGGESTIONS
                                </h4>
                                <div className="space-y-2">
                                    {suggestions.map((text, i) => (
                                        <button
                                            key={i}
                                            className="w-full text-left p-3 text-sm bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-between group"
                                            onClick={() => {
                                                if (chatRef.current) {
                                                    chatRef.current.sendMessage(text);
                                                }
                                            }}
                                        >
                                            {text}
                                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-50/50 border-blue-100 border-dashed">
                            <CardContent className="p-6">
                                <h4 className="font-bold text-xs text-blue-800 uppercase tracking-wider mb-2">Capability Radar</h4>
                                <div className="space-y-3 mt-4">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Zap className="h-4 w-4 text-blue-600" />
                                        <span className="text-slate-600">Zero-latency Navigation</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <History className="h-4 w-4 text-blue-600" />
                                        <span className="text-slate-600">Complex Data Analysis</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Sparkles className="h-4 w-4 text-blue-600" />
                                        <span className="text-slate-600">Smart Voice Commands</span>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-blue-100">
                                    <p className="text-[10px] text-blue-700/60 leading-relaxed italic">
                                        "Smart Assistant uses a hybrid of local intent-matching and secure LLM fallbacks for maximum performance."
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
