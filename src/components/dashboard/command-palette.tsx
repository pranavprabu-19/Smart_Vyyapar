"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
    Home, BarChart3, Box, FileText, Users, User, Warehouse, TruckIcon, Truck, Camera,
    Clock, FileSpreadsheet, ShieldCheck, Settings, Sparkles, ShoppingBag, Percent,
    Factory, MessageSquare, Bell, Route, Package, Plus, IndianRupee, ShoppingCart,
    Tag, RotateCcw,
} from "lucide-react";
import { useAuth, UserRole } from "@/lib/auth-context";
import { useCommandPalette } from "@/lib/command-palette-context";
import { useCompany } from "@/lib/company-context";
import { cn } from "@/lib/utils";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { DialogTitle } from "@/components/ui/dialog";
import { getEmployeesAction } from "@/actions/employee";
import { getCustomersAction } from "@/actions/customer";
import { getProductsAction } from "@/actions/inventory";

type NavEntry = { id: string; label: string; href: string; icon: React.ElementType; roles: UserRole[] };
type ActionEntry = { id: string; label: string; href: string; icon: React.ElementType; roles: UserRole[] };

const navEntries: NavEntry[] = [
    { id: "nav-overview", label: "Overview", href: "/dashboard/admin", icon: Home, roles: ["ADMIN"] },
    { id: "nav-analytics", label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["ADMIN"] },
    { id: "nav-inventory", label: "Stock & Inventory", href: "/dashboard/inventory", icon: Box, roles: ["ADMIN", "SO_OFFICIER", "FIELD_WORKER", "AUDITOR"] },
    { id: "nav-godowns", label: "Godowns", href: "/dashboard/godowns", icon: Warehouse, roles: ["ADMIN", "SO_OFFICIER"] },
    { id: "nav-invoices", label: "Invoices & Billing", href: "/dashboard/invoices", icon: FileText, roles: ["ADMIN", "EMPLOYEE"] },
    { id: "nav-customers", label: "Customers", href: "/dashboard/customers", icon: Users, roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER"] },
    { id: "nav-collections", label: "Collections", href: "/dashboard/collections", icon: IndianRupee, roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER"] },
    { id: "nav-orders", label: "Orders", href: "/dashboard/orders", icon: ShoppingCart, roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER", "FIELD_WORKER"] },
    { id: "nav-schemes", label: "Schemes", href: "/dashboard/schemes", icon: Tag, roles: ["ADMIN"] },
    { id: "nav-beats", label: "Beat Planning", href: "/dashboard/beats", icon: Route, roles: ["ADMIN", "SO_OFFICIER"] },
    { id: "nav-returns", label: "Returns", href: "/dashboard/returns", icon: RotateCcw, roles: ["ADMIN", "EMPLOYEE"] },
    { id: "nav-van-sales", label: "Van Sales", href: "/dashboard/van-sales", icon: Truck, roles: ["ADMIN", "DRIVER"] },
    { id: "nav-visits", label: "Shop Visits", href: "/dashboard/visits", icon: Users, roles: ["ADMIN", "SO_OFFICIER", "FIELD_WORKER", "EMPLOYEE"] },
    { id: "nav-trips", label: "Trip Sheets", href: "/dashboard/trips", icon: TruckIcon, roles: ["ADMIN", "DRIVER"] },
    { id: "nav-vehicles", label: "Vehicles", href: "/dashboard/vehicles", icon: Truck, roles: ["ADMIN"] },
    { id: "nav-photos", label: "Site Photos", href: "/dashboard/photos", icon: Camera, roles: ["ADMIN", "DRIVER", "FIELD_WORKER"] },
    { id: "nav-employees", label: "Employees", href: "/dashboard/employees", icon: Users, roles: ["ADMIN"] },
    { id: "nav-attendance", label: "Attendance", href: "/dashboard/attendance", icon: Clock, roles: ["ADMIN"] },
    { id: "nav-payroll", label: "Payroll", href: "/dashboard/payroll", icon: FileText, roles: ["ADMIN"] },
    { id: "nav-pos", label: "POS", href: "/dashboard/pos", icon: ShoppingBag, roles: ["EMPLOYEE", "ADMIN", "SO_OFFICIER", "FIELD_WORKER"] },
    { id: "nav-balance-sheet", label: "Balance Sheet", href: "/dashboard/reports/balance-sheet", icon: FileSpreadsheet, roles: ["ADMIN", "AUDITOR"] },
    { id: "nav-billwise-pnl", label: "Billwise P&L", href: "/dashboard/reports/billwise-pnl", icon: FileSpreadsheet, roles: ["ADMIN", "AUDITOR"] },
    { id: "nav-partywise-pnl", label: "Partywise P&L", href: "/dashboard/reports/partywise-pnl", icon: FileSpreadsheet, roles: ["ADMIN", "AUDITOR"] },
    { id: "nav-item-batch", label: "Item Batch/Serial", href: "/dashboard/reports/item-batch", icon: FileSpreadsheet, roles: ["ADMIN", "AUDITOR"] },
    { id: "nav-stock", label: "Stock Reports", href: "/dashboard/reports/stock", icon: FileSpreadsheet, roles: ["ADMIN", "AUDITOR"] },
    { id: "nav-gstr", label: "GST Reports (GSTR)", href: "/dashboard/reports/gstr", icon: FileSpreadsheet, roles: ["ADMIN", "AUDITOR"] },
    { id: "nav-tax-one", label: "TaxOne (CA Connect)", href: "/dashboard/tax-one", icon: ShieldCheck, roles: ["ADMIN", "AUDITOR"] },
    { id: "nav-settings-general", label: "General Settings", href: "/dashboard/settings/general", icon: Settings, roles: ["ADMIN"] },
    { id: "nav-settings-taxes", label: "TCS/TDS Rates", href: "/dashboard/settings/taxes", icon: Percent, roles: ["ADMIN"] },
    { id: "nav-settings-firms", label: "Manage Firms", href: "/dashboard/settings/firms", icon: Factory, roles: ["ADMIN"] },
    { id: "nav-settings-comm", label: "Communication", href: "/dashboard/settings/communication", icon: MessageSquare, roles: ["ADMIN"] },
    { id: "nav-settings-reminders", label: "Services/Reminders", href: "/dashboard/settings/reminders", icon: Bell, roles: ["ADMIN"] },
    { id: "nav-settings-eway", label: "E-Way Bills", href: "/dashboard/settings/eway", icon: Truck, roles: ["ADMIN"] },
    { id: "nav-settings-profile", label: "Profile Manager", href: "/dashboard/settings/profile", icon: Users, roles: ["ADMIN"] },
    { id: "nav-ai", label: "AI Assistant", href: "/dashboard/ai", icon: Sparkles, roles: ["ADMIN", "SO_OFFICIER", "EMPLOYEE"] },
];

const actionEntries: ActionEntry[] = [
    { id: "act-invoice", label: "New Invoice", href: "/dashboard/pos", icon: Plus, roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER", "FIELD_WORKER"] },
    { id: "act-customer", label: "Add Customer", href: "/dashboard/customers", icon: Users, roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER"] },
    { id: "act-product", label: "Add Product", href: "/dashboard/inventory", icon: Package, roles: ["ADMIN", "SO_OFFICIER"] },
    { id: "act-trip", label: "New Trip", href: "/dashboard/trips", icon: Route, roles: ["ADMIN", "DRIVER"] },
    { id: "act-order", label: "New Order", href: "/dashboard/orders", icon: ShoppingCart, roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER", "FIELD_WORKER"] },
    { id: "act-collection", label: "Record Payment", href: "/dashboard/collections", icon: IndianRupee, roles: ["ADMIN", "EMPLOYEE", "SO_OFFICIER"] },
];

const LIMIT = 50;

export function CommandPalette() {
    const ctx = useCommandPalette();
    const router = useRouter();
    const { user } = useAuth();
    const { currentCompany } = useCompany();
    const role = (user?.role || "ADMIN") as UserRole;

    const open = ctx?.open ?? false;
    const setOpen = ctx?.setOpen ?? (() => { });
    const toggle = ctx?.toggle ?? (() => { });

    const [employees, setEmployees] = useState<{ id: string; name: string; employeeId: string; role: string }[]>([]);
    const [customers, setCustomers] = useState<{ id: string; name: string; address?: string | null }[]>([]);
    const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);

    const nav = useMemo(() => navEntries.filter((e) => e.roles.includes(role)), [role]);
    const actions = useMemo(() => actionEntries.filter((e) => e.roles.includes(role)), [role]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggle();
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [toggle]);

    useEffect(() => {
        if (!open || !currentCompany) return;
        let cancelled = false;
        (async () => {
            const [empRes, custRes, prodRes] = await Promise.all([
                getEmployeesAction(currentCompany),
                getCustomersAction(currentCompany),
                getProductsAction(currentCompany),
            ]);
            if (cancelled) return;
            if (empRes.success && empRes.employees) {
                setEmployees(empRes.employees.slice(0, LIMIT).map((e: any) => ({ id: e.id, name: e.name, employeeId: e.employeeId, role: e.role })));
            } else {
                setEmployees([]);
            }
            if (custRes.success && custRes.customers) {
                setCustomers(custRes.customers.slice(0, LIMIT).map((c: any) => ({ id: c.id, name: c.name, address: c.address })));
            } else {
                setCustomers([]);
            }
            if (prodRes.success && prodRes.products) {
                setProducts(prodRes.products.slice(0, LIMIT).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
            } else {
                setProducts([]);
            }
        })();
        return () => { cancelled = true; };
    }, [open, currentCompany]);

    const run = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Command palette"
            overlayClassName="bg-black/60"
            contentClassName="fixed left-[50%] top-[15%] z-50 translate-x-[-50%] w-full max-w-2xl gap-0 overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-2xl"
        >
            <VisuallyHidden.Root asChild>
                <DialogTitle>Command palette</DialogTitle>
            </VisuallyHidden.Root>
            <Command.Input
                placeholder="Search navigation, actions…"
                className="flex h-12 w-full border-0 border-b border-input bg-transparent px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
            <Command.List className="max-h-[min(60vh,400px)] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                    No results found.
                </Command.Empty>
                {actions.length > 0 && (
                    <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {actions.map((a) => {
                            const Icon = a.icon;
                            return (
                                <Command.Item
                                    key={a.id}
                                    value={`${a.label} ${a.href}`}
                                    onSelect={() => run(a.href)}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                                        "aria-selected:bg-accent aria-selected:text-accent-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                                    <span>{a.label}</span>
                                </Command.Item>
                            );
                        })}
                    </Command.Group>
                )}
                <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {nav.map((n) => {
                        const Icon = n.icon;
                        return (
                            <Command.Item
                                key={n.id}
                                value={`${n.label} ${n.href}`}
                                onSelect={() => run(n.href)}
                                className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>{n.label}</span>
                            </Command.Item>
                        );
                    })}
                </Command.Group>
                {employees.length > 0 && (
                    <Command.Group heading="Employees" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {employees.map((e) => (
                            <Command.Item
                                key={`emp-${e.id}`}
                                value={`${e.name} ${e.employeeId} ${e.role}`}
                                onSelect={() => run("/dashboard/employees")}
                                className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                                )}
                            >
                                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>{e.name}</span>
                                <span className="text-xs text-muted-foreground truncate">{e.role} · {e.employeeId}</span>
                            </Command.Item>
                        ))}
                    </Command.Group>
                )}
                {customers.length > 0 && (
                    <Command.Group heading="Customers" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {customers.map((c) => (
                            <Command.Item
                                key={`cust-${c.id}`}
                                value={`${c.name} ${c.address ?? ""}`}
                                onSelect={() => run(`/dashboard/customers/${c.id}`)}
                                className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                                )}
                            >
                                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>{c.name}</span>
                                {c.address && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{c.address}</span>}
                            </Command.Item>
                        ))}
                    </Command.Group>
                )}
                {products.length > 0 && (
                    <Command.Group heading="Products" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {products.map((p) => (
                            <Command.Item
                                key={`prod-${p.id}`}
                                value={`${p.name} ${p.sku}`}
                                onSelect={() => run("/dashboard/inventory")}
                                className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                                )}
                            >
                                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>{p.name}</span>
                                <span className="text-xs text-muted-foreground">{p.sku}</span>
                            </Command.Item>
                        ))}
                    </Command.Group>
                )}
            </Command.List>
        </Command.Dialog>
    );
}
