"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Truck, Camera, Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCommandPalette } from "@/lib/command-palette-context";

export function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuth();
    const palette = useCommandPalette();

    if (!user) return null;

    const homeHref =
        user.role === "AUDITOR"
            ? "/dashboard/auditor"
            : user.role === "DRIVER"
              ? "/dashboard/trips"
              : "/dashboard/admin";

    const navItems = [
        { href: homeHref, label: "Home", icon: Home },
        { href: "/dashboard/visits", label: "Visits", icon: Users, roles: ["ADMIN", "SO_OFFICIER", "FIELD_WORKER"] },
        { href: "/dashboard/trips", label: "Trips", icon: Truck, roles: ["ADMIN", "DRIVER"] },
        { href: "/dashboard/photos", label: "Photos", icon: Camera, roles: ["ADMIN", "DRIVER", "FIELD_WORKER"] },
    ];

    // Filter items based on role
    const filteredItems = navItems.filter(item => !item.roles || item.roles.includes(user.role || "ADMIN"));

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t md:hidden pb-safe">
            <div className="flex items-center justify-around h-16">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
                <button
                    type="button"
                    onClick={() => palette?.toggle()}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Open search (⌘K)"
                >
                    <Search className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Search</span>
                </button>
                <div className="flex flex-col items-center justify-center w-full h-full">
                    <ThemeToggle className="h-8 w-8 text-muted-foreground hover:text-foreground" />
                </div>
                <Link
                    href="/dashboard/settings/profile"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Menu</span>
                </Link>
            </div>
        </div>
    );
}
