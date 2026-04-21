"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/lib/company-context";
import { getCompanyByNameAction, upsertCompanyAction } from "@/actions/company";
import { useToast } from "@/components/ui/use-toast";
import { Mail, MessageSquare, Save } from "lucide-react";

export default function CommunicationSettingsPage() {
    const { currentCompany } = useCompany();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>({});

    useEffect(() => {
        if (currentCompany) {
            loadCompanyData();
        }
    }, [currentCompany]);

    const loadCompanyData = async () => {
        const res = await getCompanyByNameAction(currentCompany);
        if (res.success && res.company) {
            setData(res.company);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await upsertCompanyAction(data);
            if (res.success) {
                toast({
                    title: "Settings Saved",
                    description: "Communication preferences have been updated.",
                    variant: "default"
                });
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to save settings.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageShell title="Communication Settings" description="Configure WhatsApp and Email notifications for invoices.">
            <div className="space-y-6">

                <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-green-600" />
                            Manual WhatsApp (default)
                        </CardTitle>
                        <CardDescription>
                            Invoice Management and Customer “Remind” use your browser: we open WhatsApp with a message,
                            generate the invoice PDF, and open it in a new tab so you can attach it in the chat.
                            No Meta API keys are required for this flow.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                            Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_APP_URL</code> to your public site URL
                            if PDF links must work outside localhost (optional for local testing).
                        </p>
                    </CardContent>
                </Card>

                {/* WhatsApp Config */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                            Optional: Meta WhatsApp Cloud API
                        </CardTitle>
                        <CardDescription>
                            Only needed if you later want server-to-WhatsApp sends without opening the browser.
                            Invoice and reminder buttons use manual WhatsApp unless you integrate a custom flow.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="whatsappPhoneId">Phone Number ID</Label>
                            <Input
                                id="whatsappPhoneId"
                                name="whatsappPhoneId"
                                placeholder="e.g., 100012345678901"
                                value={data.whatsappPhoneId || ""}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="whatsappApiKey">API Access Token (Permanent)</Label>
                            <Input
                                id="whatsappApiKey"
                                name="whatsappApiKey"
                                type="password"
                                placeholder="Start with EAAG..."
                                value={data.whatsappApiKey || ""}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="invoiceTemplateId">Invoice Template Name</Label>
                            <Input
                                id="invoiceTemplateId"
                                name="invoiceTemplateId"
                                placeholder="e.g., invoice_sent_v1"
                                value={data.invoiceTemplateId || ""}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">The template must be approved in Meta Business Manager.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Config */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-600" />
                            Email SMTP Settings
                        </CardTitle>
                        <CardDescription>
                            Configure SMTP to send invoices via email (e.g., Gmail, Outlook, AWS SES).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="emailSmtpHost">SMTP Host</Label>
                            <Input
                                id="emailSmtpHost"
                                name="emailSmtpHost"
                                placeholder="e.g., smtp.gmail.com"
                                value={data.emailSmtpHost || ""}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="emailUser">SMTP User / Email</Label>
                                <Input
                                    id="emailUser"
                                    name="emailUser"
                                    placeholder="e.g., accounts@saiassociates.com"
                                    value={data.emailUser || ""}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="emailPassword">SMTP Password / App Key</Label>
                                <Input
                                    id="emailPassword"
                                    name="emailPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={data.emailPassword || ""}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
                        {loading && <span className="animate-spin mr-2">⏳</span>}
                        <Save className="mr-2 h-4 w-4" /> Save Settings
                    </Button>
                </div>
            </div>
        </PageShell>
    );
}
