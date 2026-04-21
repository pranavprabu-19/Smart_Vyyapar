/**
 * src/components/dashboard/MLInsightsDashboard.tsx
 * =================================================
 * Client component: all recharts visualisations for the ML Insights page.
 */

"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import type {
  StockInsightResponse,
  StockInsightProduct,
} from "@/actions/stock-prediction";
import type { CustomerRiskResponse, CustomerRiskResult } from "@/actions/customer-prediction";

interface Props {
  insights: StockInsightResponse;
  risk: CustomerRiskResponse;
  defaultFilter?: string;
  defaultTab?: string;
}

// ─── Color map for stock statuses ─────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  HEALTHY: "#22c55e",
  CRITICAL_LOW: "#ef4444",
  OUT_OF_STOCK: "#7f1d1d",
  SLOW_MOVING: "#f59e0b",
  OVERSTOCK: "#3b82f6",
};

const TIER_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#f59e0b",
  C: "#ef4444",
};

export function MLInsightsDashboard({
  insights,
  risk,
  defaultFilter,
  defaultTab = "inventory",
}: Props) {
  const [activeTab, setActiveTab] = useState<"inventory" | "customers">(
    defaultTab === "customers" ? "customers" : "inventory"
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    defaultFilter ?? "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const { summary, products, seasonality } = insights;

  // ── Filtered products ────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = products;
    if (statusFilter !== "ALL") {
      if (statusFilter === "ANOMALY") {
        result = result.filter((p) => p.anomaly_flag);
      } else {
        result = result.filter((p) => p.stock_status === statusFilter);
      }
    }
    if (searchQuery) {
      result = result.filter((p) =>
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [products, statusFilter, searchQuery]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const statusChartData = [
    { name: "Healthy", value: summary.healthy, color: STATUS_COLORS.HEALTHY },
    { name: "Critical", value: summary.critical_low, color: STATUS_COLORS.CRITICAL_LOW },
    { name: "Out of stock", value: summary.out_of_stock, color: STATUS_COLORS.OUT_OF_STOCK },
    { name: "Slow moving", value: summary.slow_moving, color: STATUS_COLORS.SLOW_MOVING },
    { name: "Overstock", value: summary.overstock, color: STATUS_COLORS.OVERSTOCK },
  ].filter((d) => d.value > 0);

  const velocityData = products
    .slice(0, 20)
    .map((p) => ({
      name: p.product_name.length > 14 ? p.product_name.slice(0, 14) + "…" : p.product_name,
      velocity: p.daily_velocity,
      days_left: Math.min(p.days_of_stock_remaining, 120),
      status: p.stock_status,
    }))
    .sort((a, b) => b.velocity - a.velocity);

  const riskRadarData = [
    {
      subject: "Avg utilisation",
      value: Math.round(risk.summary.avg_credit_utilisation * 100),
      fullMark: 100,
    },
    {
      subject: "Avg return rate",
      value: Math.round(risk.summary.avg_return_rate * 100),
      fullMark: 100,
    },
    {
      subject: "Tier C %",
      value: Math.round((risk.summary.tier_c / Math.max(risk.summary.total_customers, 1)) * 100),
      fullMark: 100,
    },
    {
      subject: "Tier A %",
      value: Math.round((risk.summary.tier_a / Math.max(risk.summary.total_customers, 1)) * 100),
      fullMark: 100,
    },
    {
      subject: "Auto actions",
      value: Math.min(risk.auto_actions.reduce_credit_limit.length * 10, 100),
      fullMark: 100,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Seasonality banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-900 dark:bg-blue-950/30">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          📅 <strong>Seasonality context:</strong> Analysis for{" "}
          {seasonality.month_label} ({seasonality.weekday_label}) —
          demand forecasts adjusted for seasonal patterns.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <SummaryTile label="Total products" value={summary.total_products} />
        <SummaryTile label="Need reorder now" value={summary.needs_immediate_reorder} danger />
        <SummaryTile label="Slow moving" value={summary.slow_moving} warn />
        <SummaryTile label="High-risk customers" value={risk.summary.tier_c} warn />
        <SummaryTile
          label="Est. holding cost"
          value={`₹${summary.total_holding_cost_estimate.toLocaleString("en-IN")}`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
        {(["inventory", "customers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "inventory" ? "📦 Inventory" : "👥 Customers"}
          </button>
        ))}
      </div>

      {/* ── Inventory tab ── */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status distribution */}
            <ChartCard title="Stock status distribution">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusChartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Daily velocity — top 20 */}
            <ChartCard title="Daily sales velocity (top 20 products)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={velocityData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v.toFixed(2)} units/day`, "Velocity"]}
                  />
                  <Bar dataKey="velocity" radius={[0, 4, 4, 0]}>
                    {velocityData.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Product table */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
              <input
                type="search"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex flex-wrap gap-1.5">
                {["ALL", "CRITICAL_LOW", "OUT_OF_STOCK", "SLOW_MOVING", "OVERSTOCK", "ANOMALY"].map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        statusFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {f.replace("_", " ")}
                    </button>
                  )
                )}
              </div>
              <span className="ml-auto text-xs text-muted-foreground">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Product</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Stock</th>
                    <th className="px-4 py-2 text-right font-medium">Days left</th>
                    <th className="px-4 py-2 text-right font-medium">Lead time</th>
                    <th className="px-4 py-2 text-right font-medium">Reorder qty</th>
                    <th className="px-4 py-2 text-right font-medium">Holding cost</th>
                    <th className="px-4 py-2 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <ProductRow key={p.product_id} product={p} />
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No products match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Customers tab ── */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Radar */}
            <ChartCard title="Portfolio risk overview">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={riskRadarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar
                    name="Risk signals"
                    dataKey="value"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.15}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Tier breakdown */}
            <ChartCard title="Customer tier breakdown">
              <div className="flex h-full items-center justify-around px-4 py-6">
                {(["A", "B", "C"] as const).map((tier) => {
                  const count = {
                    A: risk.summary.tier_a,
                    B: risk.summary.tier_b,
                    C: risk.summary.tier_c,
                  }[tier];
                  const pct =
                    risk.summary.total_customers > 0
                      ? Math.round((count / risk.summary.total_customers) * 100)
                      : 0;
                  return (
                    <div key={tier} className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-semibold"
                        style={{ background: TIER_COLORS[tier] + "20", color: TIER_COLORS[tier] }}
                      >
                        {count}
                      </div>
                      <span className="text-sm font-medium">Tier {tier}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border px-4 pb-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Phase 1 signals: avg credit utilisation{" "}
                  <strong>{(risk.summary.avg_credit_utilisation * 100).toFixed(0)}%</strong> ·
                  avg return rate{" "}
                  <strong>{(risk.summary.avg_return_rate * 100).toFixed(1)}%</strong>
                </p>
              </div>
            </ChartCard>
          </div>

          {/* Auto-action banner */}
          {risk.auto_actions.reduce_credit_limit.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-400">
                ⚡ {risk.auto_actions.reduce_credit_limit.length} automatic credit limit
                reduction{risk.auto_actions.reduce_credit_limit.length > 1 ? "s" : ""} recommended
              </h3>
              <ul className="mb-3 space-y-1">
                {risk.auto_actions.reduce_credit_limit.map((c) => (
                  <li key={c.customer_id} className="text-xs text-amber-700 dark:text-amber-400">
                    • {c.customer_name} — risk score {(c.risk_score * 100).toFixed(0)}%
                  </li>
                ))}
              </ul>
              <button
                className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                onClick={() => {
                  // Call the server action from a route handler in production
                  alert(
                    "Apply auto reductions — wire to POST /api/ml/apply-risk-actions in your route handler"
                  );
                }}
              >
                Apply reductions
              </button>
            </div>
          )}

          {/* Customer table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Customer</th>
                  <th className="px-4 py-2 text-left font-medium">Tier</th>
                  <th className="px-4 py-2 text-right font-medium">Risk score</th>
                  <th className="px-4 py-2 text-right font-medium">Credit util.</th>
                  <th className="px-4 py-2 text-right font-medium">Return rate</th>
                  <th className="px-4 py-2 text-left font-medium">Top risk factor</th>
                  <th className="px-4 py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {risk.customers
                  .sort((a, b) => b.risk_score - a.risk_score)
                  .map((c) => (
                    <CustomerRow key={c.customer_id} customer={c} />
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  danger,
  warn,
}: {
  label: string;
  value: number | string;
  danger?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        danger
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : warn
          ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          : "border-border bg-card"
      }`}
    >
      <div
        className={`text-2xl font-semibold ${
          danger
            ? "text-red-700 dark:text-red-400"
            : warn
            ? "text-amber-700 dark:text-amber-400"
            : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function ProductRow({ product: p }: { product: StockInsightProduct }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="px-4 py-2.5 font-medium">
        {p.product_name}
        {p.anomaly_flag && (
          <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
            anomaly
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={p.stock_status} />
      </td>
      <td className="px-4 py-2.5 text-right">{p.current_stock.toLocaleString("en-IN")}</td>
      <td className="px-4 py-2.5 text-right">
        <span className={p.needs_immediate_reorder ? "font-semibold text-destructive" : ""}>
          {p.days_of_stock_remaining === 999 ? "∞" : p.days_of_stock_remaining.toFixed(0)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right text-muted-foreground">
        {p.supplier_lead_time_days}d
      </td>
      <td className="px-4 py-2.5 text-right">
        {p.needs_immediate_reorder ? (
          <span className="font-semibold text-destructive">{p.suggested_reorder_qty}</span>
        ) : (
          p.suggested_reorder_qty
        )}
      </td>
      <td className="px-4 py-2.5 text-right text-muted-foreground">
        {p.holding_cost_estimate > 0
          ? `₹${p.holding_cost_estimate.toLocaleString("en-IN")}`
          : "—"}
      </td>
      <td className="px-4 py-2.5 text-right">{p.margin_pct}%</td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    HEALTHY: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400",
    CRITICAL_LOW: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400",
    OUT_OF_STOCK: "bg-red-200 text-red-900 dark:bg-red-950/60 dark:text-red-300",
    SLOW_MOVING: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
    OVERSTOCK: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  };
  const labels: Record<string, string> = {
    HEALTHY: "Healthy",
    CRITICAL_LOW: "Critical",
    OUT_OF_STOCK: "Out of stock",
    SLOW_MOVING: "Slow moving",
    OVERSTOCK: "Overstock",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}

function CustomerRow({ customer: c }: { customer: CustomerRiskResult }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="px-4 py-2.5 font-medium">{c.customer_name}</td>
      <td className="px-4 py-2.5">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ background: TIER_COLORS[c.risk_tier] + "20", color: TIER_COLORS[c.risk_tier] }}
        >
          Tier {c.risk_tier}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <RiskBar score={c.risk_score} />
      </td>
      <td className="px-4 py-2.5 text-right">
        {(c.credit_utilisation_ratio * 100).toFixed(0)}%
      </td>
      <td className="px-4 py-2.5 text-right">{(c.return_rate * 100).toFixed(1)}%</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {c.risk_factors[0] ?? "—"}
      </td>
      <td className="px-4 py-2.5">
        {c.recommended_limit_action !== "NO_ACTION" && (
          <ActionBadge action={c.recommended_limit_action} />
        )}
      </td>
    </tr>
  );
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score > 0.65 ? "#ef4444" : score > 0.35 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    REDUCE_LIMIT: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    MONITOR: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    INCREASE_ELIGIBLE: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  };
  const labels: Record<string, string> = {
    REDUCE_LIMIT: "Reduce limit",
    MONITOR: "Monitor",
    INCREASE_ELIGIBLE: "Can increase",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[action] ?? ""}`}>
      {labels[action] ?? action}
    </span>
  );
}
