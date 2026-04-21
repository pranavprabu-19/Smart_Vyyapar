import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const capabilities = [
  { name: "Professional Billing & Invoicing", status: "Live" },
  { name: "Multi-Godown Inventory Management", status: "Live" },
  { name: "Payment Tracking & Collections", status: "Live" },
  { name: "Stock Reports & Analytics", status: "Growing" },
  { name: "Route Optimization & Delivery", status: "Growing" },
  { name: "Customer Management", status: "Live" },
];

export default function FeatureAuditPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">SmartVyapar Feature Audit</h1>
        <p className="text-muted-foreground">
          This page keeps product capability status aligned with the landing page and execution roadmap.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Capability Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {capabilities.map((feature) => (
            <div key={feature.name} className="flex items-center justify-between rounded-md border p-3">
              <span className="font-medium">{feature.name}</span>
              <Badge variant={feature.status === "Live" ? "default" : "secondary"}>{feature.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        For the detailed engineering checklist and execution notes, refer to{" "}
        <code>docs/FEATURE_AUDIT_AND_ROADMAP.md</code> in the repository.
      </p>

      <Link href="/" className="text-sm text-primary hover:underline">
        Back to landing page
      </Link>
    </main>
  );
}
