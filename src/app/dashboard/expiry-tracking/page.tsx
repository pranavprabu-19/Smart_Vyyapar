"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Calendar,
  Package,
  Search,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Download,
  Bell,
} from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { toast } from "sonner";

// Mock data for batch/expiry
const mockBatches = [
  {
    id: "1",
    productName: "Bisleri Water 1L",
    sku: "BIS-1L",
    batchNo: "B2024-001",
    mfgDate: new Date("2024-01-15"),
    expiryDate: new Date("2025-01-15"),
    quantity: 500,
    godownName: "Main Warehouse",
    status: "SAFE",
    daysToExpiry: 350,
  },
  {
    id: "2",
    productName: "Vedica Himalayan 500ml",
    sku: "VED-500",
    batchNo: "V2024-045",
    mfgDate: new Date("2024-06-01"),
    expiryDate: new Date("2025-02-15"),
    quantity: 200,
    godownName: "Branch Store",
    status: "NEAR_EXPIRY",
    daysToExpiry: 45,
  },
  {
    id: "3",
    productName: "Club Soda 750ml",
    sku: "SODA-750",
    batchNo: "S2024-012",
    mfgDate: new Date("2024-03-01"),
    expiryDate: new Date("2025-01-20"),
    quantity: 50,
    godownName: "Main Warehouse",
    status: "CRITICAL",
    daysToExpiry: 12,
  },
  {
    id: "4",
    productName: "Limonata 600ml",
    sku: "LIM-600",
    batchNo: "L2024-008",
    mfgDate: new Date("2024-05-01"),
    expiryDate: new Date("2024-12-31"),
    quantity: 30,
    godownName: "Main Warehouse",
    status: "EXPIRED",
    daysToExpiry: -5,
  },
];

export default function ExpiryTrackingPage() {
  const { currentCompany } = useCompany();
  const [batches, setBatches] = useState(mockBatches);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const formatDate = (date: Date | string) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

  // Filter batches
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch = batch.productName.toLowerCase().includes(search.toLowerCase()) ||
      batch.batchNo.toLowerCase().includes(search.toLowerCase()) ||
      batch.sku.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, daysToExpiry: number) => {
    switch (status) {
      case "EXPIRED":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case "CRITICAL":
        return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1" />{daysToExpiry}d left</Badge>;
      case "NEAR_EXPIRY":
        return <Badge className="bg-orange-100 text-orange-700"><Clock className="h-3 w-3 mr-1" />{daysToExpiry}d left</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Safe</Badge>;
    }
  };

  // Metrics
  const totalBatches = batches.length;
  const expiredCount = batches.filter(b => b.status === "EXPIRED").length;
  const criticalCount = batches.filter(b => b.status === "CRITICAL").length;
  const nearExpiryCount = batches.filter(b => b.status === "NEAR_EXPIRY").length;

  const handleSetAlert = (batchId: string) => {
    toast.success("Expiry alert set! You'll be notified before expiry.");
  };

  const handleExportReport = () => {
    toast.success("Expiry report downloaded!");
  };

  return (
    <PageShell
      title="Batch & Expiry Tracking"
      description="Monitor product batches and expiry dates with FEFO management"
      icon={<Calendar className="h-6 w-6" />}
      action={
        <Button onClick={handleExportReport}>
          <Download className="h-4 w-4 mr-2" /> Export Report
        </Button>
      }
    >
      {/* Alert Banner */}
      {(expiredCount > 0 || criticalCount > 0) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-800">Attention Required!</p>
            <p className="text-sm text-red-600">
              {expiredCount > 0 && `${expiredCount} batch(es) expired. `}
              {criticalCount > 0 && `${criticalCount} batch(es) expiring within 15 days.`}
            </p>
          </div>
          <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
            Take Action
          </Button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalBatches}</div>
            <p className="text-xs text-muted-foreground">Total Batches</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
            <p className="text-xs text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Critical (&lt;15 days)</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-green-500/10 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{nearExpiryCount}</div>
            <p className="text-xs text-muted-foreground">Near Expiry (15-60 days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product, batch number, or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CRITICAL">Critical (&lt;15d)</SelectItem>
                <SelectItem value="NEAR_EXPIRY">Near Expiry (15-60d)</SelectItem>
                <SelectItem value="SAFE">Safe</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setLoading(true)}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Inventory ({filteredBatches.length})</CardTitle>
          <CardDescription>FEFO - First Expiry, First Out management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Product</th>
                  <th className="p-3 text-left font-medium">Batch No</th>
                  <th className="p-3 text-left font-medium">Godown</th>
                  <th className="p-3 text-right font-medium">Qty</th>
                  <th className="p-3 text-left font-medium">Mfg Date</th>
                  <th className="p-3 text-left font-medium">Expiry</th>
                  <th className="p-3 text-center font-medium">Status</th>
                  <th className="p-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No batches found</p>
                    </td>
                  </tr>
                ) : (
                  filteredBatches
                    .sort((a, b) => a.daysToExpiry - b.daysToExpiry) // FEFO sorting
                    .map((batch) => (
                      <tr key={batch.id} className={`hover:bg-muted/50 ${batch.status === "EXPIRED" ? "bg-red-50" : batch.status === "CRITICAL" ? "bg-orange-50" : ""}`}>
                        <td className="p-3">
                          <div className="font-medium">{batch.productName}</div>
                          <div className="text-xs text-muted-foreground">SKU: {batch.sku}</div>
                        </td>
                        <td className="p-3 font-mono text-xs">{batch.batchNo}</td>
                        <td className="p-3 text-sm">{batch.godownName}</td>
                        <td className="p-3 text-right font-medium">{batch.quantity}</td>
                        <td className="p-3 text-sm">{formatDate(batch.mfgDate)}</td>
                        <td className="p-3 text-sm font-medium">{formatDate(batch.expiryDate)}</td>
                        <td className="p-3 text-center">{getStatusBadge(batch.status, batch.daysToExpiry)}</td>
                        <td className="p-3 text-center">
                          {batch.status !== "EXPIRED" && batch.status !== "SAFE" && (
                            <Button variant="ghost" size="sm" onClick={() => handleSetAlert(batch.id)}>
                              <Bell className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FEFO Info */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold">FEFO - First Expiry, First Out</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Batches are sorted by expiry date to ensure products expiring first are sold first. 
                This helps reduce wastage and maintain product quality.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
