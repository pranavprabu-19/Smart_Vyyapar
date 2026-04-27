"use server";

/**
 * SmartVyapar — ML Insights Server Actions
 * Connects Next.js frontend to the FastAPI ml-service.
 *
 * All functions are typed end-to-end. Import what you need in your
 * page/component server components or route handlers.
 */

import { getMlServiceBaseUrl } from "@/lib/ml-service-base-url";

const ML_BASE_URL = getMlServiceBaseUrl();

// ─────────────────────────────────────────────────────────────────────────────
// Shared fetch helper
// ─────────────────────────────────────────────────────────────────────────────

async function mlFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ML_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Next.js 14+ cache: no-store so we always get fresh ML results
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ML service error ${res.status}: ${detail}`);
  }

  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirroring the FastAPI Pydantic schemas
// ─────────────────────────────────────────────────────────────────────────────

/* ---------- Recommendations ---------- */

export interface ProductRecommendation {
  product_id: string;
  confidence: number;
  lift: number;
  category: string | null;
}

export interface CategoryRecommendation {
  category: string;
  confidence: number;
  lift: number;
}

export interface RecommendResponse {
  product_recommendations: ProductRecommendation[];
  category_recommendations: CategoryRecommendation[];
  based_on_products: string[];
}

/* ---------- Stock Insights ---------- */

export type StockStatus =
  | "OUT_OF_STOCK"
  | "CRITICAL_LOW"
  | "SLOW_MOVING"
  | "OVERSTOCK"
  | "HEALTHY";

export interface ProductStockInput {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  sale_date: string;
  current_stock: number;
  purchase_price: number;
  selling_price: number;
  supplier_lead_time_days?: number;
  category?: string;
  recent_daily_sales?: number[];
}

export interface StockInsightResult {
  product_id: string;
  product_name: string;
  stock_status: StockStatus;
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
  forecast_next_7_days?: number;
  forecast_model?: string;
}

export interface StockInsightsResponse {
  analysis_date: string;
  seasonality: {
    month: number;
    weekday: number;
    month_label: string;
    weekday_label: string;
    month_sin: number;
    month_cos: number;
  };
  summary: {
    total_products: number;
    critical_low: number;
    out_of_stock: number;
    slow_moving: number;
    overstock: number;
    healthy: number;
    needs_immediate_reorder: number;
    anomalies_detected: number;
    total_holding_cost_estimate: number;
  };
  products: StockInsightResult[];
}

/* ---------- Customer Risk ---------- */

export interface CustomerPaymentInput {
  customer_id: string;
  customer_name: string;
  total_purchases: number;
  outstanding_balance: number;
  days_since_last_purchase: number;
  payment_frequency: number;
  average_order_value: number;
  total_orders: number;
  credit_limit: number;
  invoices_last_90_days: number;
  credit_notes_last_90_days: number;
}

export type RiskTier = "A" | "B" | "C";

export interface PaymentDefaultResult {
  customer_id: string;
  customer_name: string;
  risk_score: number;
  risk_tier: RiskTier;
  credit_utilisation_ratio: number;
  return_rate: number;
  recommended_limit_action: string;
  risk_factors: string[];
}

export interface PredictPaymentDefaultResponse {
  summary: {
    total_customers: number;
    tier_a: number;
    tier_b: number;
    tier_c: number;
    auto_limit_reduction_candidates: number;
    avg_credit_utilisation: number;
    avg_return_rate: number;
  };
  customers: PaymentDefaultResult[];
  auto_actions: {
    reduce_credit_limit: Array<{
      customer_id: string;
      customer_name: string;
      risk_score: number;
    }>;
  };
}

/* ---------- Business Intelligence ---------- */

export interface DailyRevenueRecord {
  date: string;
  revenue: number;
}

export interface CustomerTxRecord {
  customer_id: string;
  customer_name: string;
  last_purchase_date: string | null;
  total_orders: number;
  total_revenue: number;
}

export interface BusinessIntelligenceRequest {
  daily_revenue: DailyRevenueRecord[];
  customers: CustomerTxRecord[];
}

export interface ForecastRecord {
  date: string;
  predicted_revenue: number;
}

export interface RFMSegmentRecord {
  customer_id: string;
  customer_name: string;
  segment: string;
  recency_days: number;
  frequency: number;
  monetary: number;
}

export interface BusinessIntelligenceResponse {
  forecast_next_7_days: ForecastRecord[];
  rfm_segments: RFMSegmentRecord[];
  segment_summary: {
    Champions: number;
    Loyal: number;
    "At Risk": number;
    Lost: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 1: Category-aware recommendations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get product and category recommendations based on the current cart or
 * recently purchased products.
 *
 * @example
 * const recs = await getRecommendations({
 *   productIds: ["P001", "P002"],
 *   topN: 5,
 * });
 */
export async function getRecommendations({
  productIds,
  topN = 5,
  includeCategoryRecommendations = true,
}: {
  productIds: string[];
  topN?: number;
  includeCategoryRecommendations?: boolean;
}): Promise<RecommendResponse> {
  return mlFetch<RecommendResponse>("/recommendations", {
    product_ids: productIds,
    top_n: topN,
    include_category_recommendations: includeCategoryRecommendations,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 2: Stock insights
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse stock levels and get reorder recommendations.
 * Pass your full product catalogue or a filtered subset.
 *
 * @example
 * const insights = await getStockInsights([
 *   {
 *     product_id: "P001",
 *     product_name: "Amul Milk 1L",
 *     category: "Dairy",
 *     current_stock: 80,
 *     velocity_30d: 0.05,   // < 0.1 → will be flagged slow-moving
 *     lead_time_days: 3,
 *   },
 * ]);
 */
export async function getStockInsights(
  salesData: ProductStockInput[],
  analysisDate?: string
): Promise<StockInsightsResponse> {
  return mlFetch<StockInsightsResponse>("/stock-insights", {
    sales_data: salesData,
    analysis_date: analysisDate,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 3: Payment default prediction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score each debtor for payment default risk.
 *
 * @example
 * const risk = await predictPaymentDefault({
 *   customers: [
 *     {
 *       customer_id: "C001",
 *       customer_name: "Rajan Stores",
 *       current_balance: 120000,
 *       avg_days_past_due: 45,
 *       total_invoices: 30,
 *       paid_on_time_count: 10,
 *       max_days_past_due: 90,
 *       credit_limit: 150000,
 *     },
 *   ],
 *   modelPreference: "auto",
 * });
 */
export async function predictPaymentDefault({
  customers,
}: {
  customers: CustomerPaymentInput[];
}): Promise<PredictPaymentDefaultResponse> {
  return mlFetch<PredictPaymentDefaultResponse>("/customer-risk", {
    customers,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 3.5: Business Intelligence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get RFM segments and revenue forecasts.
 */
export async function predictBusinessIntelligence(
  payload: BusinessIntelligenceRequest
): Promise<BusinessIntelligenceResponse> {
  return mlFetch<BusinessIntelligenceResponse>("/business-intelligence", payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 4: Re-train models (Admin only)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrainResponse {
  status: string;
  product_rules_count: number;
  category_rules_count: number;
  payment_model: string;
}

/**
 * Trigger a full model re-train. Call after bulk transaction imports.
 * Guard this behind an admin-only check in your route handler.
 */
export async function retrainModels(
  modelPreference: "logistic" | "random_forest" = "random_forest"
): Promise<TrainResponse> {
  const res = await fetch(
    `${ML_BASE_URL}/train?model_preference=${modelPreference}`,
    { method: "POST", cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Re-train failed: ${res.status}`);
  return res.json() as Promise<TrainResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: ML service health check
// ─────────────────────────────────────────────────────────────────────────────

export async function getMLServiceHealth(): Promise<{
  status: string;
  product_rules_loaded: boolean;
  category_rules_loaded: boolean;
  payment_model_loaded: boolean;
  payment_model_type: string | null;
}> {
  const res = await fetch(`${ML_BASE_URL}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("ML service unreachable");
  return res.json();
}
