"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth, UserRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageShellProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
}

export function PageShell({ title, description, children, className, action, icon }: PageShellProps) {
    const { user, login } = useAuth();

    return (
        <div className={cn("space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500", className)}>
            <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/admin" className="md:hidden">
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                {icon && <div className="text-primary">{icon}</div>}
                                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{title}</h1>
                            </div>
                            {description && (
                                <p className="text-sm text-muted-foreground mt-1">{description}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {action && <div>{action}</div>}

                    {/* Role Switcher (Dev Tool) */}
                    <div className="hidden md:block">
                        <select
                            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={user?.role || "ADMIN"}
                            onChange={(e) => login(e.target.value as UserRole)}
                            title="Switch User Role (Debug)"
                        >
                            <option value="ADMIN">Admin</option>
                            <option value="SO_OFFICIER">SO Officer</option>
                            <option value="FIELD_WORKER">Field Worker</option>
                            <option value="DRIVER">Driver</option>
                            <option value="EMPLOYEE">Employee</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="min-h-[400px]">
                {children || (
                    <Card className="border-dashed shadow-sm bg-muted/30">
                        <CardHeader className="text-center py-16">
                            <CardTitle className="text-xl mb-2">Coming Soon</CardTitle>
                            <CardDescription>
                                This module is currently under development. Check back later!
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </div>
    );
}
