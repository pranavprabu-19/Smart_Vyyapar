"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  IndianRupee,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Award,
  Zap,
  RefreshCw,
  Download,
  Clock,
  Percent,
  CreditCard,
  FileText,
} from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { toast } from "sonner";
import { AnalyticsProPeriod, getAnalyticsProDataAction } from "@/actions/dashboard";

export default function AnalyticsProPage() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<AnalyticsProPeriod>("this_month");
  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalyticsProDataAction>> | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatNumber = (num: number) => new Intl.NumberFormat("en-IN").format(num);

  const GrowthIndicator = ({ value }: { value: number }) => (
    <span className={`flex items-center text-xs font-medium ${value >= 0 ? "text-green-600" : "text-red-600"}`}>
      {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getAnalyticsProDataAction(period, currentCompany);
      setData(res);
      if (!res.success) {
        toast.error(res.error || "Could not load analytics");
      }
      setLoading(false);
    };
    load();
  }, [period, currentCompany]);

  const metrics = data?.metrics || {
    revenue: { current: 0, previous: 0, growth: 0 },
    orders: { current: 0, previous: 0, growth: 0 },
    customers: { active: 0, new: 0, churned: 0 },
    avgOrderValue: { current: 0, previous: 0, growth: 0 },
    collection: { rate: 0, outstanding: 0, overdue: 0 },
    inventory: { turnover: 0, lowStock: 0, deadStock: 0 },
  };
  const salesByDay = data?.salesByDay || [];
  const topProducts = data?.topProducts || [];
  const topCustomers = data?.topCustomers || [];
  const maxSales = Math.max(1, ...salesByDay.map(d => d.value));
  const hasData = !!data?.success;

  const handleExportCsv = () => {
    if (!hasData) {
      toast.error("No analytics data to export yet");
      return;
    }
    const rows = [
      ["Metric", "Value"],
      ["Period", period],
      ["Revenue", String(metrics.revenue.current)],
      ["Orders", String(metrics.orders.current)],
      ["Active Customers", String(metrics.customers.active)],
      ["New Customers", String(metrics.customers.new)],
      ["Average Order Value", String(metrics.avgOrderValue.current)],
      ["Collection Rate", String(metrics.collection.rate)],
      ["Outstanding", String(metrics.collection.outstanding)],
      ["Overdue", String(metrics.collection.overdue)],
      ["Inventory Turnover", String(metrics.inventory.turnover)],
      ["Low Stock Items", String(metrics.inventory.lowStock)],
      ["Dead Stock Items", String(metrics.inventory.deadStock)],
      [],
      ["Weekly Sales Trend"],
      ["Day", "Amount"],
      ...salesByDay.map((d) => [d.day, String(d.value)]),
      [],
      ["Top Products"],
      ["Name", "Revenue", "Units"],
      ...topProducts.map((p) => [p.name, String(p.revenue), String(p.units)]),
      [],
      ["Top Customers"],
      ["Name", "Revenue", "Orders", "Outstanding"],
      ...topCustomers.map((c) => [c.name, String(c.revenue), String(c.orders), String(c.outstanding)]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-pro-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics CSV downloaded");
  };

  return (
    <PageShell
      title="Analytics Dashboard"
      description="Operational KPI dashboard based on live transactional data"
      icon={<BarChart3 className="h-6 w-6" />}
      action={
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as AnalyticsProPeriod)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      }
    >
      <Card className="mb-6 border-blue-400/30 bg-blue-500/10">
        <CardContent className="pt-4 text-sm">
          Live operational analytics from your current database. For statutory filing, audited statements, and ledger exports, use Invoices, Collections, and Stock Reports exports.
        </CardContent>
      </Card>
      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-7 w-28 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <IndianRupee className="h-5 w-5 text-blue-600" />
                  <GrowthIndicator value={metrics.revenue.growth} />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(metrics.revenue.current)}</div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-7 w-28 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  <GrowthIndicator value={metrics.orders.growth} />
                </div>
                <div className="text-2xl font-bold">{metrics.orders.current}</div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-7 w-28 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <Badge className="bg-green-100 text-green-700 text-xs">+{metrics.customers.new}</Badge>
                </div>
                <div className="text-2xl font-bold">{metrics.customers.active}</div>
                <p className="text-xs text-muted-foreground">Active Customers</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
          <CardContent className="pt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-7 w-28 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  <GrowthIndicator value={metrics.avgOrderValue.growth} />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(metrics.avgOrderValue.current)}</div>
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Percent className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-muted-foreground">Collection Rate</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{metrics.collection.rate.toFixed(1)}%</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${metrics.collection.rate}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="h-5 w-5 text-red-600" />
              <span className="text-xs text-muted-foreground">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.collection.overdue)}</div>
            <p className="text-xs text-muted-foreground">Outstanding: {formatCurrency(metrics.collection.outstanding)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-5 w-5 text-green-600" />
              <span className="text-xs text-muted-foreground">Inventory Turnover</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{metrics.inventory.turnover.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">{metrics.inventory.lowStock} low stock items</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <span className="text-xs text-muted-foreground">Health Score</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{Math.max(0, 100 - metrics.inventory.lowStock * 3 - Math.min(30, metrics.collection.overdue > 0 ? 20 : 0))}/100</div>
            <p className="text-xs text-muted-foreground">{metrics.inventory.lowStock <= 3 ? "Good" : "Needs Attention"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="flex items-end justify-between h-40 gap-2">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-muted rounded-t"
                        style={{ height: `${25 + (idx % 4) * 18}%` }}
                      />
                      <div className="h-3 w-6 bg-muted rounded" />
                    </div>
                  ))}
                </div>
                <div className="h-4 w-40 bg-muted rounded mt-4 mx-auto" />
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between h-40 gap-2">
                  {salesByDay.map((day: { day: string; value: number }) => (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${(day.value / maxSales) * 100}%` }}
                        title={formatCurrency(day.value)}
                      />
                      <span className="text-xs text-muted-foreground">{day.day}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  Total: {formatCurrency(salesByDay.reduce((sum, d) => sum + d.value, 0))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-muted" />
                      <div className="space-y-1">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-4 w-20 bg-muted rounded" />
                      <div className="h-3 w-10 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product: { name: string; revenue: number; units: number; growth: number }, index: number) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-gray-100 text-gray-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(product.units)} units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(product.revenue)}</p>
                      <GrowthIndicator value={product.growth} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-md border overflow-hidden animate-pulse">
              <div className="h-10 bg-muted/60" />
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-3 p-3">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Rank</th>
                    <th className="p-3 text-left font-medium">Customer</th>
                    <th className="p-3 text-right font-medium">Revenue</th>
                    <th className="p-3 text-right font-medium">Orders</th>
                    <th className="p-3 text-right font-medium">Outstanding</th>
                    <th className="p-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topCustomers.map((customer: { name: string; revenue: number; orders: number; outstanding: number }, index: number) => (
                    <tr key={customer.name} className="hover:bg-muted/50">
                      <td className="p-3">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? "bg-yellow-100 text-yellow-700" :
                          index === 1 ? "bg-gray-100 text-gray-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{customer.name}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(customer.revenue)}</td>
                      <td className="p-3 text-right">{customer.orders}</td>
                      <td className="p-3 text-right">
                        <span className={customer.outstanding > 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(customer.outstanding)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {customer.outstanding === 0 ? (
                          <Badge className="bg-green-100 text-green-700">Clear</Badge>
                        ) : customer.outstanding > 10000 ? (
                          <Badge className="bg-red-100 text-red-700">High Due</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
