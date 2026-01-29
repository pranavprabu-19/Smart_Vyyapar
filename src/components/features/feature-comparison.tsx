"use client";

import { Check, X, HelpCircle, Crown, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Data Structure
const features = [
    {
        category: "Features", items: [
            { name: "Sync data across devices", free: true, premium: true },
            { name: "Create multiple companies", free: "3 companies", premium: "5 companies" },
            { name: "Generate E-way Bills", free: "10 per month", premium: "unlimited" },
            { name: "Restore deleted transactions", free: "2 transactions", premium: "unlimited" },
            { name: "Remove advertisement on invoices", free: true, premium: true },
            { name: "Set multiple pricing for items", free: true, premium: true },
            { name: "Update Items in bulk", free: true, premium: true },
            { name: "Set credit limit for parties", free: false, premium: true },
            { name: "Add Fixed Assets", free: true, premium: true },
            { name: "Automate Payment Reminders", free: false, premium: true },
            { name: "Combine multiple orders/challans into one sale", free: false, premium: true },
            { name: "Accounting Module", free: false, premium: true },
            { name: "WhatsApp Connect", free: false, premium: true },
            { name: "Google Profile Manager", free: true, premium: true },
        ]
    },
    {
        category: "Report", items: [
            { name: "Balance Sheet", free: true, premium: true },
            { name: "Billwise Profit and Loss Reports", free: true, premium: true },
            { name: "Partywise Profit and Loss Report", free: false, premium: true },
            { name: "Item Batch and Serial Report", free: true, premium: true },
        ]
    },
    {
        category: "Setting", items: [
            { name: "Add TCS on invoices", free: false, premium: true },
            { name: "Keep different rates for each party", free: false, premium: true },
            { name: "Create Multiple Firms", free: "3 Firms", premium: "5 Firms" },
            { name: "Check Profit on Invoices", free: false, premium: true },
            { name: "Add Expenses with input tax credit", free: true, premium: true },
            { name: "Add additional fields to items", free: true, premium: true },
            { name: "Send transaction message to self", free: false, premium: true },
            { name: "Send message on updating any transaction", free: false, premium: true },
            { name: "Add TDS on invoices", free: false, premium: true },
            { name: "Service reminders", free: false, premium: true },
        ]
    }
];

const RenderValue = ({ value, isPremium }: { value: boolean | string, isPremium?: boolean }) => {
    if (value === true) {
        return <div className="flex justify-center"><Check className={`h-5 w-5 ${isPremium ? 'text-green-500' : 'text-green-500'}`} /></div>;
    }
    if (value === false) {
        return <div className="flex justify-center"><X className="h-5 w-5 text-red-400" /></div>;
    }
    return <div className={`text-sm font-medium text-center ${isPremium ? 'text-green-600' : 'text-muted-foreground'}`}>{value}</div>;
};

export function FeatureComparison() {
    return (
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Choose Your Power
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Unlock the full potential of your business with our Premium plan. Compare features below.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto">
                    {/* Header Row (Sticky on mobile?) */}
                    <div className="grid grid-cols-12 gap-4 mb-8 items-end">
                        <div className="col-span-6 md:col-span-6"></div>
                        <div className="col-span-3 md:col-span-3 text-center">
                            <h3 className="font-bold text-xl mb-2 text-muted-foreground">Basic</h3>
                            <Button variant="outline" className="w-full">Current Plan</Button>
                        </div>
                        <div className="col-span-3 md:col-span-3 text-center relative">
                            {/* Popular Badge */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                                <Crown className="h-3 w-3" /> BEST VALUE
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-primary">Premium</h3>
                            <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity">Upgrade Now</Button>
                        </div>
                    </div>

                    <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
                        <CardContent className="p-0">
                            {features.map((section, sIdx) => (
                                <div key={section.category}>
                                    {/* Section Header */}
                                    <div className="bg-muted/50 p-4 border-y border-border/50">
                                        <h4 className="font-bold text-lg flex items-center gap-2">
                                            {section.category}
                                        </h4>
                                    </div>

                                    {/* Rows */}
                                    <div className="divide-y divide-border/50">
                                        {section.items.map((item, iIdx) => (
                                            <motion.div
                                                key={item.name}
                                                initial={{ opacity: 0 }}
                                                whileInView={{ opacity: 1 }}
                                                transition={{ delay: iIdx * 0.02 }}
                                                viewport={{ once: true }}
                                                className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors items-center"
                                            >
                                                <div className="col-span-6 md:col-span-6 flex items-center gap-2">
                                                    <span className="text-sm md:text-base font-medium">{item.name}</span>
                                                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help opacity-50 hidden md:block" />
                                                </div>

                                                {/* Free Column */}
                                                <div className="col-span-3 md:col-span-3 flex items-center justify-center">
                                                    <RenderValue value={item.free} isPremium={false} />
                                                </div>

                                                {/* Premium Column - With subtle highlight */}
                                                <div className="col-span-3 md:col-span-3 flex items-center justify-center relative">
                                                    {/* Background highlight for premium column */}
                                                    <div className="absolute inset-y-0 -inset-x-2 bg-primary/5 -z-10 rounded-lg opacity-0 md:opacity-100" />
                                                    <RenderValue value={item.premium} isPremium={true} />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="mt-12 text-center">
                        <p className="mb-6 text-muted-foreground">Still have questions about the Premium plan?</p>
                        <Button variant="secondary" size="lg" className="gap-2">
                            <Zap className="h-4 w-4" /> Schedule a Demo
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Fallback for Badge if not present, but usage was removed.
