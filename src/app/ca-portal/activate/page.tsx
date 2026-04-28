"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { activateCAInviteAction } from "@/actions/ca-access";
import { toast } from "sonner";

function ActivateCAPortalPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token") || "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const onActivate = async () => {
        if (!token) {
            toast.error("Invalid invite link.");
            return;
        }
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            const res = await activateCAInviteAction({ token, newPassword: password });
            if (!res.success) {
                toast.error(res.error || "Activation failed.");
                return;
            }
            toast.success("CA account activated. Please login.");
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen grid place-items-center p-6 bg-muted/10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Activate CA Access</CardTitle>
                    <CardDescription>Set your password to complete portal setup.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <Button className="w-full" onClick={onActivate} disabled={loading}>
                        {loading ? "Activating..." : "Activate Account"}
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}

export default function ActivateCAPortalPage() {
    return (
        <Suspense fallback={<main className="min-h-screen grid place-items-center p-6 bg-muted/10" />}>
            <ActivateCAPortalPageContent />
        </Suspense>
    );
}
