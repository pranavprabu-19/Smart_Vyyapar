"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/lib/company-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";
import {
  generateEWayBillAction,
  getEWaySettingsAction,
  saveEWaySettingsAction,
  testEWayConnectionAction,
} from "@/actions/eway";
import { CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";

type FormState = {
  provider: "CLEARTAX";
  environment: "SANDBOX" | "PRODUCTION";
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  gstin: string;
};

const DEFAULT_FORM: FormState = {
  provider: "CLEARTAX",
  environment: "SANDBOX",
  enabled: false,
  clientId: "",
  clientSecret: "",
  username: "",
  password: "",
  gstin: "",
};

export default function EWayBillSettingsPage() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "ADMIN";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [distanceKm, setDistanceKm] = useState("25");
  const [generationResult, setGenerationResult] = useState<{
    success?: boolean;
    message?: string;
    ewayBillNumber?: string;
    validUpto?: string;
  }>({});
  const [auditLogs, setAuditLogs] = useState<Array<any>>([]);
  const [lastStatus, setLastStatus] = useState<{
    testedAt?: string | null;
    status?: string | null;
    message?: string | null;
  }>({});

  const statusBadge = useMemo(() => {
    if (!lastStatus.status) return null;
    const success = lastStatus.status === "SUCCESS";
    return (
      <Badge variant={success ? "default" : "destructive"} className={success ? "bg-emerald-600" : ""}>
        {success ? "Connection Healthy" : "Connection Failed"}
      </Badge>
    );
  }, [lastStatus.status]);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany]);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await getEWaySettingsAction(currentCompany);
      if (!res.success || !res.data) {
        toast({
          title: "Unable to load E-Way settings",
          description: res.error || "Please check your company setup.",
          variant: "destructive",
        });
        return;
      }

      setForm({
        provider: (res.data.ewayProvider || "CLEARTAX") as "CLEARTAX",
        environment: (res.data.ewayEnvironment || "SANDBOX") as "SANDBOX" | "PRODUCTION",
        enabled: Boolean(res.data.ewayEnabled),
        clientId: res.data.ewayClientId || "",
        clientSecret: res.data.ewayClientSecret || "",
        username: res.data.ewayUsername || "",
        password: res.data.ewayPassword || "",
        gstin: res.data.ewayGstin || "",
      });
      setAuditLogs(res.data.ewayAuditLogs || []);
      setLastStatus({
        testedAt: res.data.ewayLastTestedAt,
        status: res.data.ewayLastTestStatus,
        message: res.data.ewayLastTestMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await saveEWaySettingsAction(currentCompany, form);
      if (!res.success) {
        toast({
          title: "Save failed",
          description: res.error || "Could not save E-Way settings.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Settings saved",
        description: "ClearTax E-Way credentials were updated successfully.",
      });
      await loadSettings();
    } finally {
      setSaving(false);
    }
  }

  async function onTestConnection() {
    if (!canEdit) return;
    setTesting(true);
    try {
      const res = await testEWayConnectionAction(currentCompany);
      if (!res.success) {
        toast({
          title: "Connection test failed",
          description: res.error || res.message || "ClearTax rejected the credentials.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection successful",
          description: res.message || "ClearTax credentials are valid.",
        });
      }
      await loadSettings();
    } finally {
      setTesting(false);
    }
  }

  async function onGenerateEWayBill() {
    if (!canEdit) return;
    if (!invoiceNo.trim()) {
      toast({
        title: "Invoice number required",
        description: "Enter an invoice number to generate E-Way bill.",
        variant: "destructive",
      });
      return;
    }
    if (!vehicleNo.trim()) {
      toast({
        title: "Vehicle number required",
        description: "Enter a vehicle number before generation.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await generateEWayBillAction({
        companyName: currentCompany,
        invoiceNo: invoiceNo.trim(),
        transport: {
          transportMode: "ROAD",
          vehicleNo: vehicleNo.trim().toUpperCase(),
          vehicleType: "REGULAR",
          distanceKm: Math.max(1, Number(distanceKm) || 1),
        },
      });

      if (!res.success) {
        setGenerationResult({ success: false, message: res.error || res.message || "Generation failed." });
        toast({
          title: "E-Way generation failed",
          description: res.error || res.message || "Check credentials, invoice, and provider response.",
          variant: "destructive",
        });
        return;
      }

      setGenerationResult({
        success: true,
        message: res.message,
        ewayBillNumber: res.ewayBillNumber,
        validUpto: res.validUpto,
      });
      toast({
        title: "E-Way bill generated",
        description: res.ewayBillNumber
          ? `EWB No: ${res.ewayBillNumber}`
          : "Generated successfully. Provider did not return EWB number.",
      });
      await loadSettings();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <PageShell title="E-Way Bill Configuration" description="Set up API credentials for auto-generating E-Way bills.">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ClearTax E-Way API Credentials</CardTitle>
            <CardDescription>
              Configure secure production credentials. Secrets are masked after save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canEdit ? (
              <div className="rounded-md border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                You have read-only access. Contact an admin to change E-Way settings.
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v: "CLEARTAX") => onChange("provider", v)} disabled>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLEARTAX">ClearTax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Environment</Label>
                <Select
                  value={form.environment}
                  onValueChange={(v: "SANDBOX" | "PRODUCTION") => onChange("environment", v)}
                  disabled={!canEdit || saving || testing}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SANDBOX">Sandbox</SelectItem>
                    <SelectItem value="PRODUCTION">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-between rounded-md border p-3">
                <div>
                  <Label>Enable E-Way Integration</Label>
                  <p className="text-xs text-muted-foreground">Allows generation workflow in next phase.</p>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => onChange("enabled", checked)}
                  disabled={!canEdit || saving || testing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ewayClientId">Client ID</Label>
                <Input
                  id="ewayClientId"
                  value={form.clientId}
                  onChange={(e) => onChange("clientId", e.target.value)}
                  disabled={!canEdit || saving || testing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ewayClientSecret">Client Secret</Label>
                <Input
                  id="ewayClientSecret"
                  type="password"
                  value={form.clientSecret}
                  onChange={(e) => onChange("clientSecret", e.target.value)}
                  disabled={!canEdit || saving || testing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ewayUsername">Username</Label>
                <Input
                  id="ewayUsername"
                  value={form.username}
                  onChange={(e) => onChange("username", e.target.value)}
                  disabled={!canEdit || saving || testing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ewayPassword">Password</Label>
                <Input
                  id="ewayPassword"
                  type="password"
                  value={form.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  disabled={!canEdit || saving || testing}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="ewayGstin">GSTIN</Label>
                <Input
                  id="ewayGstin"
                  value={form.gstin}
                  onChange={(e) => onChange("gstin", e.target.value.toUpperCase())}
                  disabled={!canEdit || saving || testing}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <Button variant="outline" onClick={onTestConnection} disabled={!canEdit || saving || testing || loading}>
                {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Test Connection
              </Button>
              <Button onClick={onSave} disabled={!canEdit || saving || testing || loading}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastStatus.status === "SUCCESS" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              )}
              Connection Status
            </CardTitle>
            <CardDescription>Latest ClearTax connectivity check and diagnostics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge || <Badge variant="secondary">Not tested yet</Badge>}
              {lastStatus.testedAt ? (
                <span className="text-xs text-muted-foreground">
                  Last tested: {new Date(lastStatus.testedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{lastStatus.message || "Run a test connection to verify credentials."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent E-Way Audit Logs</CardTitle>
            <CardDescription>Immutable logs for test/save activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit logs yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{log.action}</p>
                      <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"}>
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{log.message || "No message"}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate E-Way Bill (Starter)</CardTitle>
            <CardDescription>
              Quick trigger using invoice number with ROAD transport details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ewayInvoiceNo">Invoice Number</Label>
                <Input
                  id="ewayInvoiceNo"
                  placeholder="e.g., INV-2026-0012"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  disabled={!canEdit || generating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ewayVehicleNo">Vehicle Number</Label>
                <Input
                  id="ewayVehicleNo"
                  placeholder="e.g., TN01AB1234"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  disabled={!canEdit || generating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ewayDistance">Distance (KM)</Label>
                <Input
                  id="ewayDistance"
                  type="number"
                  min={1}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  disabled={!canEdit || generating}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={onGenerateEWayBill} disabled={!canEdit || generating || loading}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Generate E-Way Bill
              </Button>
            </div>

            {generationResult.message ? (
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={generationResult.success ? "default" : "destructive"}>
                    {generationResult.success ? "SUCCESS" : "FAILED"}
                  </Badge>
                  <p className="text-sm">{generationResult.message}</p>
                </div>
                {generationResult.ewayBillNumber ? (
                  <p className="text-sm mt-2">
                    <span className="font-medium">E-Way Bill Number:</span> {generationResult.ewayBillNumber}
                  </p>
                ) : null}
                {generationResult.validUpto ? (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Valid Upto:</span> {generationResult.validUpto}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
