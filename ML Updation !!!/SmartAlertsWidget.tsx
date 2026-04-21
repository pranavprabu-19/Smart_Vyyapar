/**
 * components/dashboard/SmartAlertsWidget.tsx
 * ============================================
 * The "Smart Alerts" summary card for the main /dashboard page.
 * Shows the most urgent ML signals in a compact at-a-glance widget.
 *
 * Usage:
 *   import { SmartAlertsWidget } from "@/components/dashboard/SmartAlertsWidget";
 *   // In your dashboard Server Component:
 *   const insights = await getStockInsights(session.user.businessId);
 *   const risk     = await getCustomerRiskScores(session.user.businessId);
 *   <SmartAlertsWidget insights={insights} risk={risk} />
 */

"use client";

import Link from "next/link";
import type { StockInsightResponse, CustomerRiskResponse } from "@/actions/stock-prediction";

interface Props {
  insights: StockInsightResponse;
  risk: CustomerRiskResponse;
}

export function SmartAlertsWidget({ insights, risk }: Props) {
  const { summary, seasonality } = insights;

  const alerts: Alert[] = buildAlerts(summary, risk);
  const hasAlerts = alerts.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h2 className="text-sm font-semibold text-foreground">
            Smart Alerts
          </h2>
          {hasAlerts && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              {alerts.length} issue{alerts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {seasonality.month_label} · {insights.analysis_date}
        </span>
      </div>

      {/* Metric row */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricTile
          label="Critical low"
          value={summary.critical_low + summary.out_of_stock}
          color="destructive"
          icon="🚨"
        />
        <MetricTile
          label="Slow moving"
          value={summary.slow_moving}
          color="warning"
          icon="🐢"
        />
        <MetricTile
          label="High-risk customers"
          value={risk.summary.tier_c}
          color="warning"
          icon="⚠️"
        />
        <MetricTile
          label="Holding cost (est.)"
          value={`₹${summary.total_holding_cost_estimate.toLocaleString("en-IN")}`}
          color="muted"
          icon="💰"
        />
      </div>

      {/* Alert list */}
      {hasAlerts ? (
        <ul className="space-y-2">
          {alerts.map((alert, i) => (
            <AlertRow key={i} alert={alert} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
          ✅ All inventory and customer risk indicators are healthy.
        </p>
      )}

      {/* Footer CTA */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          Powered by SmartVyapar ML · Phase 1
        </span>
        <Link
          href="/dashboard/ml-insights"
          className="text-xs font-medium text-primary hover:underline"
        >
          View full analysis →
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: "destructive" | "warning" | "muted";
  icon: string;
}) {
  const colorMap = {
    destructive: "bg-destructive/8 text-destructive",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <div className={`rounded-lg px-3 py-2 ${colorMap[color]}`}>
      <div className="mb-0.5 text-base">{icon}</div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const bgMap = {
    danger: "border-l-destructive bg-destructive/5",
    warning: "border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
    info: "border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
  };

  const textMap = {
    danger: "text-destructive",
    warning: "text-amber-700 dark:text-amber-400",
    info: "text-blue-700 dark:text-blue-400",
  };

  return (
    <li
      className={`flex items-start gap-3 rounded-lg border-l-2 px-3 py-2 ${bgMap[alert.severity]}`}
    >
      <span className="mt-0.5 text-sm">{alert.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textMap[alert.severity]}`}>
          {alert.headline}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{alert.detail}</p>
      </div>
      {alert.href && (
        <Link
          href={alert.href}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Fix →
        </Link>
      )}
    </li>
  );
}

// ─── Alert builder ────────────────────────────────────────────────────────────

interface Alert {
  headline: string;
  detail: string;
  severity: "danger" | "warning" | "info";
  icon: string;
  href?: string;
}

function buildAlerts(
  summary: StockInsightResponse["summary"],
  risk: CustomerRiskResponse
): Alert[] {
  const alerts: Alert[] = [];

  // Out of stock
  if (summary.out_of_stock > 0) {
    alerts.push({
      headline: `${summary.out_of_stock} product${summary.out_of_stock > 1 ? "s" : ""} out of stock`,
      detail: "These items cannot be sold until restocked. Revenue impact is immediate.",
      severity: "danger",
      icon: "🚫",
      href: "/dashboard/ml-insights?filter=OUT_OF_STOCK",
    });
  }

  // Critical low — needs reorder now
  if (summary.needs_immediate_reorder > 0) {
    alerts.push({
      headline: `${summary.needs_immediate_reorder} item${summary.needs_immediate_reorder > 1 ? "s" : ""} need reorder before supplier lead time`,
      detail: "Stock will run out before delivery arrives at current velocity.",
      severity: "danger",
      icon: "📦",
      href: "/dashboard/ml-insights?filter=CRITICAL_LOW",
    });
  }

  // Slow moving / capital lock-up
  if (summary.slow_moving > 0) {
    alerts.push({
      headline: `${summary.slow_moving} slow-moving product${summary.slow_moving > 1 ? "s" : ""} tying up capital`,
      detail: `Estimated holding cost: ₹${summary.total_holding_cost_estimate.toLocaleString("en-IN")}. Consider discounting or bundling.`,
      severity: "warning",
      icon: "🐢",
      href: "/dashboard/ml-insights?filter=SLOW_MOVING",
    });
  }

  // Anomalies — unexpected velocity spikes
  if (summary.anomalies_detected > 0) {
    alerts.push({
      headline: `${summary.anomalies_detected} sales anomaly detected`,
      detail: "Unusual movement vs. historical baseline — verify data or check for theft / data entry errors.",
      severity: "warning",
      icon: "📊",
      href: "/dashboard/ml-insights?filter=ANOMALY",
    });
  }

  // High-risk customers
  if (risk.summary.tier_c > 0) {
    alerts.push({
      headline: `${risk.summary.tier_c} customer${risk.summary.tier_c > 1 ? "s" : ""} at high default risk`,
      detail: `Avg credit utilisation: ${(risk.summary.avg_credit_utilisation * 100).toFixed(0)}%. Consider tightening credit terms.`,
      severity: "warning",
      icon: "👤",
      href: "/dashboard/ml-insights?tab=customers",
    });
  }

  // Auto limit reductions available
  if (risk.auto_actions.reduce_credit_limit.length > 0) {
    alerts.push({
      headline: `${risk.auto_actions.reduce_credit_limit.length} credit limit reduction${risk.auto_actions.reduce_credit_limit.length > 1 ? "s" : ""} recommended`,
      detail: "ML model predicts high default probability. Review and apply automatic reductions.",
      severity: "info",
      icon: "💳",
      href: "/dashboard/ml-insights?tab=customers&action=reduce",
    });
  }

  return alerts;
}
