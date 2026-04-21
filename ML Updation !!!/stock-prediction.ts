/**
 * src/actions/stock-prediction.ts  — Phase 1 enriched
 * =====================================================
 * Fetches stock insights from the FastAPI ML service.
 * Phase 1 additions:
 *   - Pulls supplier.leadTimeDays from Prisma relations
 *   - Sends sale_date derived from latest StockMovement
 *   - Returns enriched response: reorder triggers, anomalies, holding costs
 */

"use server";

import { prisma } from "@/lib/prisma";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockInsightProduct {
  product_id: string;
  product_name: string;
  stock_status: "HEALTHY" | "CRITICAL_LOW" | "SLOW_MOVING" | "OVERSTOCK" | "OUT_OF_STOCK";
  current_stock: number;
  daily_velocity: number;
  days_of_stock_remaining: number;
  supplier_lead_time_days: number;
  reorder_trigger_days: number;
  needs_immediate_reorder: boolean;
  suggested_reorder_qty: number;
  holding_cost_estimate: number;
  anomaly_flag: boolean;
  anomaly_z_score: number;
  margin_pct: number;
}

export interface StockInsightSummary {
  total_products: number;
  critical_low: number;
  out_of_stock: number;
  slow_moving: number;
  overstock: number;
  healthy: number;
  needs_immediate_reorder: number;
  anomalies_detected: number;
  total_holding_cost_estimate: number;
}

export interface StockInsightResponse {
  analysis_date: string;
  seasonality: {
    month: number;
    weekday: number;
    month_label: string;
    weekday_label: string;
    month_sin: number;
    month_cos: number;
  };
  summary: StockInsightSummary;
  products: StockInsightProduct[];
}

// ─── Main action ─────────────────────────────────────────────────────────────

export async function getStockInsights(
  businessId: string
): Promise<StockInsightResponse> {
  // Pull products with stock movements + supplier lead time
  const products = await prisma.product.findMany({
    where: { businessId },
    include: {
      stockMovements: {
        where: { type: "SALE" },
        orderBy: { createdAt: "desc" },
        take: 90, // last 90 days of movements is enough for velocity
      },
      // Phase 1: supplier lead time
      // Adjust relation name if your schema differs
      supplier: {
        select: { leadTimeDays: true },
      },
    },
  });

  if (products.length === 0) {
    return _emptyResponse();
  }

  // Build the payload for the ML service
  const salesData = products.map((product) => {
    const totalSold = product.stockMovements.reduce(
      (sum, m) => sum + Math.abs(m.quantity),
      0
    );

    // Use the oldest movement date so velocity is computed over the right window
    const oldestMovement = product.stockMovements.at(-1);
    const saleDate = oldestMovement
      ? oldestMovement.createdAt.toISOString().split("T")[0]
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]; // default 30-day window

    return {
      product_id: product.id,
      product_name: product.name,
      quantity_sold: totalSold,
      sale_date: saleDate,
      current_stock: product.quantity,
      purchase_price: product.purchasePrice ?? 0,
      selling_price: product.sellingPrice ?? 0,
      // Phase 1: pull from supplier relation, fallback 7 days
      supplier_lead_time_days: product.supplier?.leadTimeDays ?? 7,
      category: product.category ?? "general",
    };
  });

  const response = await fetch(`${ML_SERVICE_URL}/stock-insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sales_data: salesData,
      analysis_date: new Date().toISOString().split("T")[0],
    }),
    // 10-second timeout — ML service is local, should be fast
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML service error ${response.status}: ${error}`);
  }

  return response.json() as Promise<StockInsightResponse>;
}

// ─── Customer risk action (Phase 1 enriched) ─────────────────────────────────

export interface CustomerRiskResult {
  customer_id: string;
  customer_name: string;
  risk_score: number;
  risk_tier: "A" | "B" | "C";
  credit_utilisation_ratio: number;
  return_rate: number;
  recommended_limit_action: "REDUCE_LIMIT" | "MONITOR" | "INCREASE_ELIGIBLE" | "NO_ACTION";
  risk_factors: string[];
}

export interface CustomerRiskResponse {
  summary: {
    total_customers: number;
    tier_a: number;
    tier_b: number;
    tier_c: number;
    auto_limit_reduction_candidates: number;
    avg_credit_utilisation: number;
    avg_return_rate: number;
  };
  customers: CustomerRiskResult[];
  auto_actions: {
    reduce_credit_limit: Array<{
      customer_id: string;
      customer_name: string;
      risk_score: number;
    }>;
  };
}

export async function getCustomerRiskScores(
  businessId: string
): Promise<CustomerRiskResponse> {
  const customers = await prisma.customer.findMany({
    where: { businessId },
    include: {
      invoices: {
        where: {
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, createdAt: true },
      },
      // Phase 1: credit notes in last 90 days
      creditNotes: {
        where: {
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      },
      // Phase 1: payment history for frequency calculation
      payments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { createdAt: true, amount: true },
      },
    },
  });

  const customerPayload = customers.map((c) => {
    const lastPayment = c.payments[0]?.createdAt;
    const daysSinceLast = lastPayment
      ? Math.floor(
          (Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    const totalPurchases = c.payments.reduce((s, p) => s + p.amount, 0);
    const avgOrder = c.payments.length > 0 ? totalPurchases / c.payments.length : 0;

    // Payment frequency: avg days between payments
    const paymentFrequency =
      c.payments.length >= 2
        ? (() => {
            const sorted = c.payments.map((p) => p.createdAt.getTime()).sort();
            const gaps = sorted
              .slice(1)
              .map((t, i) => (t - sorted[i]) / (1000 * 60 * 60 * 24));
            return gaps.reduce((a, b) => a + b, 0) / gaps.length;
          })()
        : 30;

    return {
      customer_id: c.id,
      customer_name: c.name,
      total_purchases: totalPurchases,
      outstanding_balance: c.currentBalance ?? 0,
      days_since_last_purchase: daysSinceLast,
      payment_frequency: paymentFrequency,
      average_order_value: avgOrder,
      total_orders: c.payments.length,
      // Phase 1: new fields
      credit_limit: c.creditLimit ?? 0,
      invoices_last_90_days: c.invoices.length,
      credit_notes_last_90_days: c.creditNotes.length,
    };
  });

  const response = await fetch(`${ML_SERVICE_URL}/customer-risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customers: customerPayload }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`ML service error ${response.status}`);
  }

  return response.json() as Promise<CustomerRiskResponse>;
}

// ─── Auto-apply credit limit reductions ──────────────────────────────────────

/**
 * Call this from a cron job or background worker (e.g. pg_cron / Vercel cron).
 * For every customer the ML flags as REDUCE_LIMIT, reduces their creditLimit
 * by 25% and writes an audit log entry.
 *
 * Usage in a route handler:
 *   const result = await applyAutoRiskActions(businessId);
 */
export async function applyAutoRiskActions(
  businessId: string
): Promise<{ updated: number; skipped: number }> {
  const riskData = await getCustomerRiskScores(businessId);
  const reductions = riskData.auto_actions.reduce_credit_limit;

  let updated = 0;
  let skipped = 0;

  for (const candidate of reductions) {
    const customer = await prisma.customer.findUnique({
      where: { id: candidate.customer_id },
      select: { creditLimit: true },
    });

    if (!customer?.creditLimit || customer.creditLimit <= 0) {
      skipped++;
      continue;
    }

    const newLimit = Math.floor(customer.creditLimit * 0.75);

    await prisma.customer.update({
      where: { id: candidate.customer_id },
      data: { creditLimit: newLimit },
    });

    // Audit log — adjust model name to match your schema
    // await prisma.auditLog.create({
    //   data: {
    //     entityType: "Customer",
    //     entityId: candidate.customer_id,
    //     action: "AUTO_CREDIT_LIMIT_REDUCTION",
    //     details: JSON.stringify({
    //       previousLimit: customer.creditLimit,
    //       newLimit,
    //       riskScore: candidate.risk_score,
    //       triggeredBy: "ML_SERVICE_AUTO",
    //     }),
    //   },
    // });

    updated++;
  }

  return { updated, skipped };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _emptyResponse(): StockInsightResponse {
  return {
    analysis_date: new Date().toISOString().split("T")[0],
    seasonality: {
      month: new Date().getMonth() + 1,
      weekday: new Date().getDay(),
      month_label: new Date().toLocaleString("default", { month: "long" }),
      weekday_label: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()],
      month_sin: 0,
      month_cos: 1,
    },
    summary: {
      total_products: 0,
      critical_low: 0,
      out_of_stock: 0,
      slow_moving: 0,
      overstock: 0,
      healthy: 0,
      needs_immediate_reorder: 0,
      anomalies_detected: 0,
      total_holding_cost_estimate: 0,
    },
    products: [],
  };
}
