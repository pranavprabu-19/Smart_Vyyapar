"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw,
  Plus,
  Search,
  RefreshCw,
  Package,
  IndianRupee,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  X,
  Trash2,
} from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { toast } from "sonner";

// Mock data
const mockReturns = [
  {
    id: "1",
    returnNo: "RET-001",
    customerName: "ABC Stores",
    invoiceNo: "INV-123",
    date: new Date(),
    reason: "DAMAGED",
    status: "PENDING",
    items: [
      { name: "Bisleri 1L", qty: 10, rate: 20, total: 200 },
    ],
    totalAmount: 200,
    creditNoteNo: null,
  },
  {
    id: "2",
    returnNo: "RET-002",
    customerName: "XYZ Mart",
    invoiceNo: "INV-456",
    date: new Date(Date.now() - 86400000),
    reason: "EXPIRED",
    status: "APPROVED",
    items: [
      { name: "Vedica 500ml", qty: 5, rate: 40, total: 200 },
    ],
    totalAmount: 200,
    creditNoteNo: "CN-001",
  },
  {
    id: "3",
    returnNo: "RET-003",
    customerName: "Quick Shop",
    invoiceNo: "INV-789",
    date: new Date(Date.now() - 172800000),
    reason: "WRONG_ITEM",
    status: "REJECTED",
    items: [
      { name: "Club Soda 750ml", qty: 12, rate: 20, total: 240 },
    ],
    totalAmount: 240,
    creditNoteNo: null,
  },
];

const reasonConfig: Record<string, { label: string; color: string }> = {
  DAMAGED: { label: "Damaged", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expired", color: "bg-orange-100 text-orange-700" },
  WRONG_ITEM: { label: "Wrong Item", color: "bg-blue-100 text-blue-700" },
  QUALITY_ISSUE: { label: "Quality Issue", color: "bg-yellow-100 text-yellow-700" },
  OTHER: { label: "Other", color: "bg-gray-100 text-gray-700" },
};

export default function ReturnsPage() {
  const { currentCompany } = useCompany();
  const [returns, setReturns] = useState(mockReturns);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReturn, setNewReturn] = useState({
    customerId: "",
    invoiceId: "",
    reason: "DAMAGED",
    items: [] as { productId: string; name: string; qty: number; rate: number }[],
    notes: "",
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: Date | string) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

  // Filter returns
  const filteredReturns = returns.filter((ret) => {
    const matchesSearch = ret.returnNo.toLowerCase().includes(search.toLowerCase()) ||
      ret.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || ret.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const handleApprove = (id: string) => {
    setReturns(returns.map(r => 
      r.id === id 
        ? { ...r, status: "APPROVED", creditNoteNo: `CN-${Date.now().toString(36).toUpperCase()}` }
        : r
    ));
    toast.success("Return approved and credit note generated!");
  };

  const handleReject = (id: string) => {
    setReturns(returns.map(r => r.id === id ? { ...r, status: "REJECTED" } : r));
    toast.success("Return rejected");
  };

  // Metrics
  const totalReturns = returns.length;
  const pendingReturns = returns.filter(r => r.status === "PENDING").length;
  const approvedValue = returns.filter(r => r.status === "APPROVED").reduce((sum, r) => sum + r.totalAmount, 0);
  const pendingValue = returns.filter(r => r.status === "PENDING").reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <PageShell
      title="Sales Returns"
      description="Manage product returns and credit notes"
      icon={<RotateCcw className="h-6 w-6" />}
      action={
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Return
        </Button>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalReturns}</div>
            <p className="text-xs text-muted-foreground">Total Returns</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingReturns}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(approvedValue)}</div>
            <p className="text-xs text-muted-foreground">Credit Notes Issued</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(pendingValue)}</div>
            <p className="text-xs text-muted-foreground">Pending Value</p>
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
                placeholder="Search return number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setLoading(true)}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns List */}
      <Card>
        <CardHeader>
          <CardTitle>Returns ({filteredReturns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReturns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No returns found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReturns.map((ret) => {
                const reason = reasonConfig[ret.reason] || reasonConfig.OTHER;
                return (
                  <div key={ret.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{ret.returnNo}</span>
                          {getStatusBadge(ret.status)}
                          <Badge className={reason.color}>{reason.label}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>{ret.customerName}</span>
                          <span className="mx-2">•</span>
                          <span>Invoice: {ret.invoiceNo}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(ret.date)}</span>
                        </div>
                        <div className="text-sm mt-1">
                          {ret.items.map((item, i) => (
                            <span key={i} className="text-muted-foreground">
                              {item.name} ({item.qty} pcs)
                              {i < ret.items.length - 1 && ", "}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(ret.totalAmount)}</div>
                          {ret.creditNoteNo && (
                            <div className="text-xs text-green-600">
                              <FileText className="h-3 w-3 inline mr-1" />
                              {ret.creditNoteNo}
                            </div>
                          )}
                        </div>
                        {ret.status === "PENDING" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleReject(ret.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(ret.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Return Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Create Sales Return</CardTitle>
                  <CardDescription>Record product return from customer</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Invoice *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice to return" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">INV-123 - ABC Stores</SelectItem>
                    <SelectItem value="2">INV-456 - XYZ Mart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Return Reason *</Label>
                <Select value={newReturn.reason} onValueChange={(v) => setNewReturn({ ...newReturn, reason: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                    <SelectItem value="QUALITY_ISSUE">Quality Issue</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Input
                  placeholder="Additional notes..."
                  value={newReturn.notes}
                  onChange={(e) => setNewReturn({ ...newReturn, notes: e.target.value })}
                />
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  After selecting an invoice, you can select items to return.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => { toast.success("Return created!"); setShowCreateModal(false); }}>
                  Create Return
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
