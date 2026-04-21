"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart3, Box, FileText, Home, Settings, ShoppingBag, Sparkles, Star,
    ChevronDown, FileSpreadsheet, Percent, Factory, MessageSquare,
    User, Bell, Truck, Users, TruckIcon, Camera, Clock, ShieldCheck, Warehouse,
    IndianRupee, ShoppingCart, Tag, Route, RotateCcw, Calendar, PieChart, Calculator
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCommandPalette } from "@/lib/command-palette-context";
import { useState, useEffect } from "react";

import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/lib/auth-context";
import { useCompany } from "@/lib/company-context";
import { Button } from "@/components/ui/button";
import { useInvoice } from "@/lib/invoice-context";

type SidebarItem = {
    icon: React.ElementType;
    label: string;
    href?: string;
    roles: UserRole[];
    subItems?: { label: string; href: string; icon?: React.ElementType }[];
};

const sidebarItems: SidebarItem[] = [
    // Admin Master View
    { icon: Home, label: "Overview", href: "/dashboard/admin", roles: ["ADMIN"] },
    { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics", roles: ["ADMIN"] },
    { icon: PieChart, label: "Analytics Pro", href: "/dashboard/analytics-pro", roles: ["ADMIN"] },
    { icon: Sparkles, label: "ML Intelligence", href: "/dashboard/ml-insights", roles: ["ADMIN", "SO_OFFICIER"] },

    // Core Operations
    { icon: Box, label: "Stock & Inventory", href: "/dashboard/inventory", roles: ["ADMIN", "SO_OFFICIER", "FIELD_WORKER", "AUDITOR"] },
    { icon: Warehouse, label: "Godowns", href: "/dashboard/godowns", roles: ["ADMIN", "SO_OFFICIER"] },
    { icon: Calendar, label: "Expiry Tracking", href: "/dashboard/expiry-tracking", roles: ["ADMIN", "SO_OFFICIER"] },
    { icon: FileText, label: "Invoices & Billing", href: "/dashboard/invoices", roles: ["ADMIN", "EMPLOYEE"] },
    { icon: Users, label: "Customers", href: "/dashboard/customers", roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER"] },
    { icon: IndianRupee, label: "Collections", href: "/dashboard/collections", roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER"] },
    { icon: Calculator, label: "Assets", href: "/dashboard/assets", roles: ["ADMIN"] },

    // Orders & Schemes (Distribution)
    { icon: ShoppingCart, label: "Orders", href: "/dashboard/orders", roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER", "FIELD_WORKER"] },
    { icon: Tag, label: "Schemes", href: "/dashboard/schemes", roles: ["ADMIN"] },
    { icon: Route, label: "Beat Planning", href: "/dashboard/beats", roles: ["ADMIN", "SO_OFFICIER"] },
    { icon: RotateCcw, label: "Returns", href: "/dashboard/returns", roles: ["ADMIN", "EMPLOYEE"] },
    { icon: Truck, label: "Van Sales", href: "/dashboard/van-sales", roles: ["ADMIN", "DRIVER"] },

    // Field Work & Logistics
    { icon: Users, label: "Shop Visits", href: "/dashboard/visits", roles: ["ADMIN", "SO_OFFICIER", "FIELD_WORKER", "EMPLOYEE"] },
    { icon: TruckIcon, label: "Trip Sheets", href: "/dashboard/trips", roles: ["ADMIN", "DRIVER"] },
    { icon: Truck, label: "Vehicles", href: "/dashboard/vehicles", roles: ["ADMIN"] },
    { icon: Camera, label: "Site Photos", href: "/dashboard/photos", roles: ["ADMIN", "DRIVER", "FIELD_WORKER"] },

    // HR & Payroll
    {
        icon: User,
        label: "HR & Payroll",
        roles: ["ADMIN"],
        subItems: [
            { label: "Employees", href: "/dashboard/employees", icon: Users },
            { label: "Attendance", href: "/dashboard/attendance", icon: Clock },
            { label: "Payroll", href: "/dashboard/payroll", icon: FileText },
        ]
    },

    // Core Features (Legacy)
    { icon: ShoppingBag, label: "POS", href: "/dashboard/pos", roles: ["EMPLOYEE", "ADMIN", "SO_OFFICIER", "FIELD_WORKER"] },

    // Reports
    {
        icon: FileSpreadsheet,
        label: "Reports",
        roles: ["ADMIN", "AUDITOR"],
        subItems: [
            { label: "Balance Sheet", href: "/dashboard/reports/balance-sheet" },
            { label: "Billwise P&L", href: "/dashboard/reports/billwise-pnl" },
            { label: "Partywise P&L", href: "/dashboard/reports/partywise-pnl" },
            { label: "Item Batch/Serial", href: "/dashboard/reports/item-batch" },
            { label: "Stock Reports", href: "/dashboard/reports/stock" },
            { label: "GST Reports (GSTR)", href: "/dashboard/reports/gstr" },
        ]
    },

    // TaxOne
    { icon: ShieldCheck, label: "TaxOne (CA Connect)", href: "/dashboard/tax-one", roles: ["ADMIN", "AUDITOR"] },

    // Settings
    {
        icon: Settings,
        label: "Configuration",
        roles: ["ADMIN"],
        subItems: [
            { label: "General Settings", href: "/dashboard/settings/general", icon: Settings },
            { label: "TCS/TDS Rates", href: "/dashboard/settings/taxes", icon: Percent },
            { label: "Manage Firms", href: "/dashboard/settings/firms", icon: Factory },
            { label: "Communication", href: "/dashboard/settings/communication", icon: MessageSquare },
            { label: "Services/Reminders", href: "/dashboard/settings/reminders", icon: Bell },
            { label: "E-Way Bills", href: "/dashboard/settings/eway", icon: Truck },
            { label: "Profile Manager", href: "/dashboard/settings/profile", icon: User },
        ]
    },

    // Shared
    { icon: Sparkles, label: "AI Assistant", href: "/dashboard/ai", roles: ["ADMIN", "SO_OFFICIER", "EMPLOYEE"] },
];

import { getCompaniesAction } from "@/actions/company";

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { currentCompany, setCompany } = useCompany();
    const palette = useCommandPalette();
    const { notifications } = useInvoice();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
    const [availableCompanies, setAvailableCompanies] = useState<string[]>(["Sai Associates", "SNK Distributors"]);

    useEffect(() => {
        getCompaniesAction().then(res => {
            if (res.success && res.companies) {
                const dbNames = res.companies.map((c: any) => c.name);
                setAvailableCompanies(prev => Array.from(new Set([...prev, ...dbNames])));
            }
        });
    }, []);

    if (!user || !user.role) return null;

    const unreadCount = notifications.filter(n => !n.read && n.targetRoles.includes(user.role!)).length;

    const filteredItems = sidebarItems.filter(item => item.roles.includes(user.role!));

    const toggleMenu = (label: string) => {
        setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    return (
        <div className="h-screen w-64 border-r bg-gradient-to-b from-card to-card/95 backdrop-blur-sm hidden md:flex flex-col shadow-xl z-20 relative">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

            {/* Company Switcher Header + North Star */}
            <div className="p-4 border-b bg-gradient-to-r from-muted/30 to-muted/10 backdrop-blur-sm relative z-10">
                <div className="flex items-center justify-between mb-2 px-2">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 font-bold text-lg rounded-md px-1 py-0.5 -mx-1 hover:bg-muted/40 transition-colors"
                        title="Go to SmartVyapar home/login"
                    >
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 transition-transform duration-200 hover:scale-105">
                            <ShoppingBag className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-gradient leading-none">SmartVyapar</span>
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500/80 transition-transform duration-200 hover:scale-110" />
                    </Link>
                    <div className="flex items-center">
                        <ThemeToggle className="h-8 w-8" />
                    </div>
                </div>

                <div className="relative">
                    <select
                        className="w-full p-2 text-sm border rounded-md bg-background font-medium appearance-none cursor-pointer hover:bg-muted/50 transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
                        value={currentCompany}
                        onChange={(e) => setCompany(e.target.value as any)}
                    >
                        {availableCompanies.map(company => (
                            <option key={company} value={company}>{company}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <ChevronDown className="h-3 w-3" />
                    </div>
                </div>
            </div>

            {/* User Profile Info & Notifications */}
            <div className="px-6 pt-4 pb-2 relative z-10">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-1 rounded-md">
                        {user.role.replace('_', ' ')}
                    </div>

                    {/* Notification Bell */}
                    <Link href="/dashboard/invoices" className="relative group">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/20">
                            <Bell className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-[10px] text-white font-bold animate-pulse shadow-lg">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </Link>
                </div>
                <div className="text-sm font-semibold truncate" title={user.name}>{user.name}</div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto relative z-10">
                {filteredItems.map((item) => {
                    const hasSubItems = !!item.subItems;
                    const isOpen = openMenus[item.label];
                    const isActive = item.href ? pathname === item.href : item.subItems?.some(si => pathname === si.href);

                    if (hasSubItems) {
                        return (
                            <div key={item.label} className="mb-1">
                                <button
                                    onClick={() => toggleMenu(item.label)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all hover:bg-muted/70 text-sm font-medium border border-transparent hover:border-border",
                                        isActive ? "text-primary bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shadow-sm" : "text-muted-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                                </button>

                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pl-11 pr-2 py-1 space-y-1 border-l ml-6 border-border/50">
                                                {item.subItems!.map((sub) => {
                                                    const isSubActive = pathname === sub.href;
                                                    return (
                                                        <Link
                                                            key={sub.label}
                                                            href={sub.href}
                                                            className={cn(
                                                                "block px-2 py-2 text-xs rounded-md transition-colors",
                                                                isSubActive
                                                                    ? "text-foreground font-semibold bg-muted"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                            )}
                                                        >
                                                            {sub.label}
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href!}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative text-sm font-medium",
                                isActive
                                    ? "text-primary bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:border hover:border-border"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t bg-gradient-to-t from-muted/30 to-transparent backdrop-blur-sm relative z-10">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" onClick={logout}>
                    <span className="mr-2">←</span> Log out
                </Button>
            </div>
        </div>
    );
}
