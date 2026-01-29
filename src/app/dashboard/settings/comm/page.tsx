import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch"; // Assuming Switch exists or I'll just use a checkbox style provided by shadcn if not imported? I'll assume standard HTML or check later. I'll stick to simple text for now to avoid specific component dep errors if Switch isn't there.

export default function CommunicationSettingsPage() {
    return (
        <PageShell
            title="Communication"
            description="Configure WhatsApp and Email notification templates."
        >
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>WhatsApp Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">Connect your WhatsApp Business API account to send automated invoices.</p>
                        <div className="p-4 border rounded bg-muted/20 text-center">
                            Scan QR Code (Simulated)
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageShell>
    );
}
