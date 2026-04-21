"use server";

/**
 * SmartVyapar — ML Insights Server Actions
 * Connects Next.js frontend to the FastAPI ml-service.
 *
 * All functions are typed end-to-end. Import what you need in your
 * page/component server components or route handlers.
 */

const ML_BASE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000";

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

export type StockStatus = "slow_moving" | "healthy" | "critical_low" | "overstock";

export interface ProductStockInput {
  product_id: string;
  product_name: string;
  category?: string;
  current_stock: number;
  velocity_30d: number;
  lead_time_days: number;
  unit_cost?: number;
  ordering_cost?: number;
  holding_cost_rate?: number;
  safety_stock_factor?: number;
  velocity_std_dev?: number;
}

export interface StockInsightResult {
  product_id: string;
  product_name: string;
  category: string | null;
  status: StockStatus;
  days_of_stock_remaining: number;
  suggested_reorder_qty: number;
  reorder_point: number;
  safety_stock: number;
  eoq: number | null;
  insight_message: string;
}

export interface StockInsightsResponse {
  results: StockInsightResult[];
  summary: Record<StockStatus, number>;
}

/* ---------- Payment Default ---------- */

export interface CustomerPaymentInput {
  customer_id: string;
  customer_name: string;
  current_balance: number;
  avg_days_past_due: number;
  total_invoices: number;
  paid_on_time_count: number;
  max_days_past_due: number;
  credit_limit?: number;
}

export type RiskTier = "low" | "medium" | "high" | "critical";

export interface PaymentDefaultResult {
  customer_id: string;
  customer_name: string;
  risk_score: number;      // 0–100
  high_risk: boolean;
  risk_tier: RiskTier;
  key_drivers: string[];
  recommended_action: string;
}

export interface PredictPaymentDefaultResponse {
  results: PaymentDefaultResult[];
  model_used: string;
  summary: Record<RiskTier, number>;
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
  products: ProductStockInput[]
): Promise<StockInsightsResponse> {
  return mlFetch<StockInsightsResponse>("/stock-insights", { products });
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
  modelPreference = "auto",
}: {
  customers: CustomerPaymentInput[];
  modelPreference?: "logistic" | "random_forest" | "auto";
}): Promise<PredictPaymentDefaultResponse> {
  return mlFetch<PredictPaymentDefaultResponse>("/predict-payment-default", {
    customers,
    model_preference: modelPreference,
  });
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
