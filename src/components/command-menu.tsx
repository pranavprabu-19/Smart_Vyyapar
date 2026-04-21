"use client";

import { useEffect, useState } from "react";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    User,
    Package,
    Truck,
    FileText,
    Search,
    LayoutDashboard,
    LogOut,
    Plus
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut
} from "@/components/ui/command";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function CommandMenu() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { logout, user } = useAuth();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <>
            <p className="fixed bottom-4 right-4 text-xs text-muted-foreground hidden md:block border rounded px-2 py-1 bg-background/50 backdrop-blur-sm pointer-events-none z-50">
                Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"><span className="text-xs">⌘</span>K</kbd> to search
            </p>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/invoices/new"))}>
                            <Plus className="mr-2 h-4 w-4" />
                            <span>New Invoice</span>
                            <CommandShortcut>⌘N</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/customers"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Search Customers</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/inventory"))}>
                            <Package className="mr-2 h-4 w-4" />
                            <span>Search Inventory</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Navigation">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/invoices"))}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Invoices</span>
                            <CommandShortcut>⌘I</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/orders"))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Orders</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/trips"))}>
                            <Truck className="mr-2 h-4 w-4" />
                            <span>Trips</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/assets"))}>
                            <Calculator className="mr-2 h-4 w-4" />
                            <span>Assets</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/vehicles"))}>
                            <Truck className="mr-2 h-4 w-4" />
                            <span>Vehicles</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/schemes"))}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Schemes</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/payroll"))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Payroll</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/returns"))}>
                            <Package className="mr-2 h-4 w-4" />
                            <span>Returns</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/van-sales"))}>
                            <Truck className="mr-2 h-4 w-4" />
                            <span>Van Sales</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Settings">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => logout())}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
