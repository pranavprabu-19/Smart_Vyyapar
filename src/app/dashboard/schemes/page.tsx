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
  Tag,
  Plus,
  Search,
  RefreshCw,
  Percent,
  Gift,
  IndianRupee,
  Calendar,
  CheckCircle,
  XCircle,
  MoreVertical,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  Target,
  X,
  Pause,
  Play,
} from "lucide-react";
import { useCompany } from "@/lib/company-context";
import {
  getSchemesAction,
  getSchemeMetricsAction,
  createSchemeAction,
  toggleSchemeStatusAction,
  deleteSchemeAction,
  type CreateSchemeData,
} from "@/actions/schemes";
import { toast } from "sonner";

const schemeTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  PERCENTAGE_DISCOUNT: { label: "% Discount", color: "bg-blue-100 text-blue-700", icon: Percent },
  FLAT_DISCOUNT: { label: "Flat Discount", color: "bg-green-100 text-green-700", icon: IndianRupee },
  QUANTITY_DISCOUNT: { label: "Qty Discount", color: "bg-purple-100 text-purple-700", icon: Target },
  BUY_X_GET_Y: { label: "Buy X Get Y", color: "bg-orange-100 text-orange-700", icon: Gift },
  COMBO: { label: "Combo Offer", color: "bg-pink-100 text-pink-700", icon: Tag },
};

export default function SchemesPage() {
  const { currentCompany } = useCompany();
  const [schemes, setSchemes] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalSchemes: 0,
    activeSchemes: 0,
    totalDiscountGiven: 0,
    topScheme: "N/A",
    topSchemeUsage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScheme, setNewScheme] = useState<Partial<CreateSchemeData>>({
    type: "PERCENTAGE_DISCOUNT",
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    customerTiers: ["A", "B", "C"],
  });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schemesRes, metricsRes] = await Promise.all([
        getSchemesAction(currentCompany, statusFilter !== "all" ? { isActive: statusFilter === "active" } : undefined),
        getSchemeMetricsAction(currentCompany),
      ]);

      if (schemesRes.success) setSchemes(schemesRes.schemes || []);
      if (metricsRes.success && metricsRes.metrics) setMetrics(metricsRes.metrics);
    } catch (error) {
      console.error("Failed to load schemes:", error);
      toast.error("Failed to load schemes");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentCompany, statusFilter]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: Date | string) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

  // Filter schemes
  const filteredSchemes = schemes.filter((scheme) =>
    scheme.name.toLowerCase().includes(search.toLowerCase()) ||
    scheme.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Check if scheme is currently active
  const isSchemeActive = (scheme: any) => {
    const now = new Date();
    return scheme.isActive && new Date(scheme.startDate) <= now && new Date(scheme.endDate) >= now;
  };

  // Create scheme
  const handleCreateScheme = async () => {
    if (!newScheme.name || !newScheme.type) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createSchemeAction({
        companyName: currentCompany,
        name: newScheme.name!,
        description: newScheme.description,
        type: newScheme.type as any,
        minQuantity: newScheme.minQuantity,
        minAmount: newScheme.minAmount,
        buyQuantity: newScheme.buyQuantity,
        getQuantity: newScheme.getQuantity,
        discountPercent: newScheme.discountPercent,
        discountAmount: newScheme.discountAmount,
        startDate: newScheme.startDate!,
        endDate: newScheme.endDate!,
        customerTiers: newScheme.customerTiers,
        budget: newScheme.budget,
        maxUsagePerCustomer: newScheme.maxUsagePerCustomer,
      });

      if (res.success) {
        toast.success("Scheme created successfully!");
        setShowCreateModal(false);
        setNewScheme({
          type: "PERCENTAGE_DISCOUNT",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          customerTiers: ["A", "B", "C"],
        });
        loadData();
      } else {
        toast.error(res.error || "Failed to create scheme");
      }
    } catch (error) {
      toast.error("Failed to create scheme");
    }
    setIsSaving(false);
  };

  // Toggle scheme status
  const handleToggleStatus = async (schemeId: string) => {
    const res = await toggleSchemeStatusAction(schemeId);
    if (res.success) {
      toast.success("Scheme status updated");
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  // Delete scheme
  const handleDelete = async (schemeId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    const res = await deleteSchemeAction(schemeId);
    if (res.success) {
      toast.success("Scheme deleted");
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <PageShell
      title="Schemes & Promotions"
      description="Manage discounts, offers, and promotional schemes"
      icon={<Tag className="h-6 w-6" />}
      action={
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Scheme
        </Button>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{metrics.totalSchemes}</div>
            <p className="text-xs text-muted-foreground">Total Schemes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{metrics.activeSchemes}</div>
            <p className="text-xs text-muted-foreground">Active Now</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.totalDiscountGiven)}</div>
            <p className="text-xs text-muted-foreground">Total Discount Given</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20 md:col-span-2">
          <CardContent className="pt-4">
            <div className="text-lg font-bold text-orange-600">{metrics.topScheme}</div>
            <p className="text-xs text-muted-foreground">Top Scheme ({metrics.topSchemeUsage} uses)</p>
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
                placeholder="Search schemes..."
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
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schemes List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">Loading schemes...</CardContent>
          </Card>
        ) : filteredSchemes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No schemes found</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create First Scheme
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredSchemes.map((scheme) => {
            const typeConfig = schemeTypeConfig[scheme.type] || schemeTypeConfig.PERCENTAGE_DISCOUNT;
            const TypeIcon = typeConfig.icon;
            const active = isSchemeActive(scheme);

            return (
              <Card key={scheme.id} className={`transition-all ${!active ? "opacity-70" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TypeIcon className="h-5 w-5" />
                        {scheme.name}
                      </CardTitle>
                      <CardDescription className="mt-1">{scheme.description || "No description"}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      {active ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge className={typeConfig.color}>{typeConfig.label}</Badge>

                  {/* Scheme Details */}
                  <div className="text-sm space-y-1">
                    {scheme.discountPercent && (
                      <div className="flex items-center gap-2">
                        <Percent className="h-3 w-3 text-muted-foreground" />
                        <span>{scheme.discountPercent}% off</span>
                      </div>
                    )}
                    {scheme.discountAmount && (
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-3 w-3 text-muted-foreground" />
                        <span>₹{scheme.discountAmount} flat off</span>
                      </div>
                    )}
                    {scheme.buyQuantity && scheme.getQuantity && (
                      <div className="flex items-center gap-2">
                        <Gift className="h-3 w-3 text-muted-foreground" />
                        <span>Buy {scheme.buyQuantity} Get {scheme.getQuantity} Free</span>
                      </div>
                    )}
                    {scheme.minAmount && (
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span>Min order: ₹{scheme.minAmount}</span>
                      </div>
                    )}
                    {scheme.minQuantity && (
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span>Min qty: {scheme.minQuantity}</span>
                      </div>
                    )}
                  </div>

                  {/* Validity */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(scheme.startDate)} - {formatDate(scheme.endDate)}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs">
                      <span className="font-medium">{scheme._count?.appliedOrders || 0}</span> uses
                      {scheme.budget && (
                        <span className="ml-2">| Budget: {formatCurrency(scheme.budget - scheme.usedBudget)} left</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleStatus(scheme.id)}
                    >
                      {scheme.isActive ? (
                        <>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" /> Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(scheme.id, scheme.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Scheme Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Create New Scheme</CardTitle>
                  <CardDescription>Set up a promotional offer or discount</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {/* Scheme Name */}
              <div>
                <Label>Scheme Name *</Label>
                <Input
                  placeholder="e.g., Summer Sale 20% Off"
                  value={newScheme.name || ""}
                  onChange={(e) => setNewScheme({ ...newScheme, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Brief description..."
                  value={newScheme.description || ""}
                  onChange={(e) => setNewScheme({ ...newScheme, description: e.target.value })}
                />
              </div>

              {/* Scheme Type */}
              <div>
                <Label>Scheme Type *</Label>
                <Select
                  value={newScheme.type}
                  onValueChange={(v) => setNewScheme({ ...newScheme, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE_DISCOUNT">Percentage Discount</SelectItem>
                    <SelectItem value="FLAT_DISCOUNT">Flat Discount</SelectItem>
                    <SelectItem value="QUANTITY_DISCOUNT">Quantity Discount</SelectItem>
                    <SelectItem value="BUY_X_GET_Y">Buy X Get Y Free</SelectItem>
                    <SelectItem value="COMBO">Combo Offer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type-specific fields */}
              {(newScheme.type === "PERCENTAGE_DISCOUNT" || newScheme.type === "QUANTITY_DISCOUNT") && (
                <div>
                  <Label>Discount Percentage</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10"
                    value={newScheme.discountPercent || ""}
                    onChange={(e) => setNewScheme({ ...newScheme, discountPercent: parseFloat(e.target.value) })}
                  />
                </div>
              )}

              {newScheme.type === "FLAT_DISCOUNT" && (
                <div>
                  <Label>Discount Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100"
                    value={newScheme.discountAmount || ""}
                    onChange={(e) => setNewScheme({ ...newScheme, discountAmount: parseFloat(e.target.value) })}
                  />
                </div>
              )}

              {newScheme.type === "BUY_X_GET_Y" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Buy Quantity</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2"
                      value={newScheme.buyQuantity || ""}
                      onChange={(e) => setNewScheme({ ...newScheme, buyQuantity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Get Free</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 1"
                      value={newScheme.getQuantity || ""}
                      onChange={(e) => setNewScheme({ ...newScheme, getQuantity: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Order Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={newScheme.minAmount || ""}
                    onChange={(e) => setNewScheme({ ...newScheme, minAmount: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label>Min Quantity</Label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={newScheme.minQuantity || ""}
                    onChange={(e) => setNewScheme({ ...newScheme, minQuantity: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </div>

              {/* Validity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newScheme.startDate ? new Date(newScheme.startDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => setNewScheme({ ...newScheme, startDate: new Date(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newScheme.endDate ? new Date(newScheme.endDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => setNewScheme({ ...newScheme, endDate: new Date(e.target.value) })}
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <Label>Budget Limit (₹) - Optional</Label>
                <Input
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={newScheme.budget || ""}
                  onChange={(e) => setNewScheme({ ...newScheme, budget: parseFloat(e.target.value) || undefined })}
                />
              </div>
            </CardContent>
            <div className="p-4 border-t flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateScheme} disabled={isSaving || !newScheme.name}>
                {isSaving ? "Creating..." : "Create Scheme"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
