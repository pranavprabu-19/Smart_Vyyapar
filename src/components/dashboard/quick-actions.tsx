"use client";

import { Plus, FileText, Users, Package, Truck, ShoppingBag, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function QuickActions() {
    const { user } = useAuth();
    if (!user) return null;

    const quickActions = [
        {
            label: "New Invoice",
            icon: FileText,
            href: "/dashboard/pos",
            color: "from-blue-500/10 to-indigo-500/10",
            borderColor: "border-blue-500/20",
            iconColor: "text-blue-600",
            roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER", "FIELD_WORKER"]
        },
        {
            label: "Add Customer",
            icon: Users,
            href: "/dashboard/customers",
            color: "from-purple-500/10 to-pink-500/10",
            borderColor: "border-purple-500/20",
            iconColor: "text-purple-600",
            roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER"]
        },
        {
            label: "Add Product",
            icon: Package,
            href: "/dashboard/inventory",
            color: "from-emerald-500/10 to-teal-500/10",
            borderColor: "border-emerald-500/20",
            iconColor: "text-emerald-600",
            roles: ["ADMIN", "SO_OFFICIER"]
        },
        {
            label: "New Trip",
            icon: Route,
            href: "/dashboard/trips",
            color: "from-orange-500/10 to-red-500/10",
            borderColor: "border-orange-500/20",
            iconColor: "text-orange-600",
            roles: ["ADMIN", "DRIVER"]
        },
    ].filter(action => action.roles.includes(user.role || "ADMIN"));

    if (quickActions.length === 0) return null;

    return (
        <Card variant="premium" className="mb-6">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link key={action.label} href={action.href}>
                                <div className={`group relative overflow-hidden rounded-lg border ${action.borderColor} bg-gradient-to-br ${action.color} p-4 transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer`}>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center border ${action.borderColor} group-hover:scale-110 transition-transform`}>
                                            <Icon className={`h-5 w-5 ${action.iconColor}`} />
                                        </div>
                                        <span className="text-sm font-medium text-center">{action.label}</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
