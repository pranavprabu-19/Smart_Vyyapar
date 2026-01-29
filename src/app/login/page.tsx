"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction } from "@/actions/auth";
import { toast } from "sonner";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form States
    const [method, setMethod] = useState<"EMAIL" | "EMPLOYEE">("EMAIL");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Employee Login
    const [empId, setEmpId] = useState("");
    const [company, setCompany] = useState("");

    const handleLogin = async () => {
        setLoading(true);
        try {
            const identifier = method === "EMAIL" ? email : empId;
            const companyName = method === "EMPLOYEE" ? company : undefined;

            if (!identifier || !password) {
                toast.error("Please fill all fields");
                setLoading(false);
                return;
            }
            if (method === "EMPLOYEE" && !companyName) {
                toast.error("Company Name is required");
                setLoading(false);
                return;
            }

            const res = await loginAction(identifier, password, companyName);

            if (res.success && res.user) {
                toast.success(`Welcome back, ${res.user.name}`);
                login({
                    ...res.user,
                    companyName: res.user.companyName || undefined,
                    employeeId: res.user.employeeId
                });
            } else {
                toast.error(res.error || "Login Failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back
            </Link>

            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                        <ShoppingBag className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">SmartVyapar Login</CardTitle>
                    <CardDescription>Enter your credentials to access the dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex w-full bg-muted p-1 rounded-lg mb-6">
                        <button
                            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-all", method === "EMAIL" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setMethod("EMAIL")}
                        >
                            Email
                        </button>
                        <button
                            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-all", method === "EMPLOYEE" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setMethod("EMPLOYEE")}
                        >
                            Employee ID
                        </button>
                    </div>

                    {method === "EMAIL" ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email</label>
                                <Input id="email" type="email" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password-email">Password</label>
                                <Input id="password-email" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="company">Company Name</label>
                                <Input id="company" placeholder="e.g. Sai Associates" value={company} onChange={e => setCompany(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="empid">Employee ID</label>
                                <Input id="empid" placeholder="EMP-001" value={empId} onChange={e => setEmpId(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password-emp">Password</label>
                                <Input id="password-emp" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <Button className="w-full mt-6" onClick={handleLogin} disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
