"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Truck, Camera, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuth();

    if (!user) return null;

    const navItems = [
        { href: "/dashboard/admin", label: "Home", icon: Home },
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
                {/* Menu/More Item (Opens Sidebar logic roughly? Or just a settings link) */}
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
