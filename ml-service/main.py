"""
SmartVyapar ML Service — Phase 1 Signal Enrichment
====================================================
Changes from baseline:
  1. Seasonality index  — month + weekday added to all forecasts
  2. Supplier lead time — reorder suggestion fires before true stockout
  3. Credit utilisation — outstanding_balance / creditLimit added to risk model
  4. Return rate signal — credit_notes / invoices (90-day window) in risk model

Run:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
import logging
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
from pydantic import BaseModel
from scipy import stats
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBRegressor
except Exception:  # pragma: no cover - optional dependency fallback
    XGBRegressor = None

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartvyapar-ml")

app = FastAPI(
    title="SmartVyapar ML Service",
    description="Inventory intelligence + customer risk scoring (Phase 1)",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-process cache to avoid re-training on every request.
# Note: process-local only; each worker keeps its own cache.
DEMAND_MODEL_CACHE: dict[str, Any] = {
    "model": None,
    "model_name": "heuristic",
    "trained_at": None,
    "signature": None,
}
DEMAND_MODEL_CACHE_TTL_MINUTES = 30


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class SaleRecord(BaseModel):
    product_id: str
    product_name: str
    quantity_sold: float
    sale_date: str           # ISO-8601 e.g. "2024-04-01"
    current_stock: float
    purchase_price: float
    selling_price: float
    # NEW Phase 1 fields
    supplier_lead_time_days: float = 7.0   # default 7 days if not supplied
    category: str = "general"
    recent_daily_sales: list[float] | None = None


class CustomerRecord(BaseModel):
    customer_id: str
    customer_name: str
    total_purchases: float
    outstanding_balance: float
    days_since_last_purchase: float
    payment_frequency: float
    average_order_value: float
    total_orders: int
    # NEW Phase 1 fields
    credit_limit: float = 0.0             # 0 means no formal limit set
    invoices_last_90_days: int = 0
    credit_notes_last_90_days: int = 0    # returns / credit notes raised
    last_purchase_date: str | None = None


class StockInsightRequest(BaseModel):
    sales_data: list[SaleRecord]
    analysis_date: str | None = None      # ISO-8601; defaults to today


class CustomerRiskRequest(BaseModel):
    customers: list[CustomerRecord]


class ProductRecommendationRequest(BaseModel):
    transactions: list[list[str]]         # list of baskets (product names)
    min_support: float = 0.1
    min_confidence: float = 0.5


# ---------------------------------------------------------------------------
# Helper — seasonality
# ---------------------------------------------------------------------------


def _season_features(date_str: str | None = None) -> dict[str, float]:
    """Return month_sin, month_cos, weekday_sin, weekday_cos for a date.

    Sine/cosine encoding preserves cyclical continuity
    (December is adjacent to January, Sunday to Monday).
    """
    try:
        dt = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
    except ValueError:
        dt = datetime.utcnow()

    month = dt.month           # 1-12
    weekday = dt.weekday()     # 0=Mon … 6=Sun

    return {
        "month_sin": float(np.sin(2 * np.pi * month / 12)),
        "month_cos": float(np.cos(2 * np.pi * month / 12)),
        "weekday_sin": float(np.sin(2 * np.pi * weekday / 7)),
        "weekday_cos": float(np.cos(2 * np.pi * weekday / 7)),
        "month": month,
        "weekday": weekday,
    }


def _train_demand_model(df: pd.DataFrame) -> tuple[Any, str]:
    """Train demand model using 30-day rolling window features.

    Uses XGBoost when available, otherwise falls back to GradientBoostingRegressor.
    """
    lag_cols = [f"lag_{i}" for i in range(1, 31)]
    for col in lag_cols:
        if col not in df.columns:
            df[col] = 0.0

    feature_cols = lag_cols + ["month", "weekday", "supplier_lead_time_days", "margin_pct"]
    X = df[feature_cols].fillna(0.0).values
    y = np.clip(df["quantity_sold"].fillna(0.0).values / 30.0, 0.0, None)

    if len(df) < 3:
        return None, "heuristic"

    if XGBRegressor is not None:
        model = XGBRegressor(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.08,
            objective="reg:squarederror",
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
        )
        model_name = "xgboost"
    else:
        model = GradientBoostingRegressor(random_state=42)
        model_name = "gradient_boosting_fallback"

    model.fit(X, y)
    return model, model_name


def _data_signature(df: pd.DataFrame) -> tuple[int, float, float]:
    """Create a compact signature for cache invalidation."""
    qty_sum = float(df["quantity_sold"].fillna(0).sum())
    stock_sum = float(df["current_stock"].fillna(0).sum())
    return (len(df), round(qty_sum, 3), round(stock_sum, 3))


def _get_or_train_demand_model(df: pd.DataFrame) -> tuple[Any, str]:
    now = datetime.utcnow()
    signature = _data_signature(df)
    trained_at = DEMAND_MODEL_CACHE.get("trained_at")
    cached_signature = DEMAND_MODEL_CACHE.get("signature")
    cached_model = DEMAND_MODEL_CACHE.get("model")

    is_fresh = (
        trained_at is not None
        and (now - trained_at) <= timedelta(minutes=DEMAND_MODEL_CACHE_TTL_MINUTES)
    )
    same_data_shape = cached_signature == signature

    if cached_model is not None and is_fresh and same_data_shape:
        return DEMAND_MODEL_CACHE["model"], DEMAND_MODEL_CACHE["model_name"]

    model, model_name = _train_demand_model(df)
    DEMAND_MODEL_CACHE["model"] = model
    DEMAND_MODEL_CACHE["model_name"] = model_name
    DEMAND_MODEL_CACHE["trained_at"] = now
    DEMAND_MODEL_CACHE["signature"] = signature
    return model, model_name


# ---------------------------------------------------------------------------
# /stock-insights  (Phase 1 enriched)
# ---------------------------------------------------------------------------


@app.post("/stock-insights")
async def stock_insights(request: StockInsightRequest) -> dict[str, Any]:
    """
    Returns per-product inventory health with Phase 1 signal enrichment:
      - days_of_stock_remaining now accounts for supplier_lead_time_days
      - suggested_reorder_qty uses a safety stock buffer (half lead-time demand)
      - seasonality context embedded in the response for frontend display
      - anomaly_flag uses z-score on daily velocity across the product set
    """
    if not request.sales_data:
        raise HTTPException(status_code=400, detail="sales_data cannot be empty")

    analysis_date = request.analysis_date or datetime.utcnow().date().isoformat()
    season = _season_features(analysis_date)

    df = pd.DataFrame([s.model_dump() for s in request.sales_data])
    df["recent_daily_sales"] = df["recent_daily_sales"].apply(
        lambda v: v if isinstance(v, list) and len(v) > 0 else [0.0] * 30
    )
    for idx in range(1, 31):
        df[f"lag_{idx}"] = df["recent_daily_sales"].apply(
            lambda sales, i=idx: float(sales[-i]) if len(sales) >= i else 0.0
        )

    # ── velocity: units sold per day (avoid div/0) ──────────────────────────
    # Compute per-product elapsed days from its own sale_date to analysis_date
    # instead of using a global minimum date across all products.
    analysis_ts = pd.to_datetime(analysis_date)
    sale_dates = pd.to_datetime(df["sale_date"], errors="coerce")
    days_elapsed = (analysis_ts - sale_dates).dt.days.fillna(0).clip(lower=1)
    df["daily_velocity"] = df["quantity_sold"] / days_elapsed

    # ── days of stock remaining ──────────────────────────────────────────────
    df["days_of_stock_remaining"] = np.where(
        df["daily_velocity"] > 0,
        df["current_stock"] / df["daily_velocity"],
        999.0,
    )

    # ── Phase 1: reorder trigger = lead time, not zero ───────────────────────
    # Fire the reorder when stock will run out BEFORE the supplier can deliver
    df["reorder_trigger_days"] = df["supplier_lead_time_days"] * 1.2   # 20% safety buffer
    df["needs_immediate_reorder"] = df["days_of_stock_remaining"] <= df["reorder_trigger_days"]

    # ── Phase 1: suggested_reorder_qty includes safety stock ─────────────────
    # Economic Order Quantity proxy: lead_time_demand + 50% safety stock
    df["lead_time_demand"] = df["daily_velocity"] * df["supplier_lead_time_days"]
    df["safety_stock"] = df["lead_time_demand"] * 0.5
    df["suggested_reorder_qty"] = np.ceil(df["lead_time_demand"] + df["safety_stock"])

    # ── Anomaly detection via z-score on daily velocity ───────────────────────
    if len(df) >= 3:
        z_scores = np.abs(stats.zscore(df["daily_velocity"].fillna(0)))
        df["anomaly_flag"] = z_scores > 2.0
        df["anomaly_z_score"] = z_scores.round(2)
    else:
        df["anomaly_flag"] = False
        df["anomaly_z_score"] = 0.0

    # ── Classification ────────────────────────────────────────────────────────
    def classify(row: pd.Series) -> str:
        if row["current_stock"] == 0:
            return "OUT_OF_STOCK"
        if row["needs_immediate_reorder"]:
            return "CRITICAL_LOW"
        if row["daily_velocity"] < 0.05 and row["days_of_stock_remaining"] > 90:
            return "SLOW_MOVING"
        if row["current_stock"] > row["suggested_reorder_qty"] * 3:
            return "OVERSTOCK"
        return "HEALTHY"

    df["stock_status"] = df.apply(classify, axis=1)

    # ── Holding cost estimate (purchase_price × excess_stock) ─────────────────
    df["excess_units"] = np.maximum(
        df["current_stock"] - df["suggested_reorder_qty"] * 2, 0
    )
    df["holding_cost_estimate"] = (df["excess_units"] * df["purchase_price"] * 0.02).round(2)
    df["margin_pct"] = (
        (df["selling_price"] - df["purchase_price"]) / np.maximum(df["selling_price"], 0.01) * 100
    )

    # ── Phase 2: demand forecasting via rolling-window gradient boosting ─────
    df["month"] = season["month"]
    df["weekday"] = season["weekday"]
    forecast_model, model_name = _get_or_train_demand_model(df)
    if forecast_model is not None:
        lag_cols = [f"lag_{i}" for i in range(1, 31)]
        feature_cols = lag_cols + ["month", "weekday", "supplier_lead_time_days", "margin_pct"]
        predicted_daily = np.clip(
            forecast_model.predict(df[feature_cols].fillna(0.0).values),
            0.0,
            None,
        )
        df["forecast_next_7_days"] = np.ceil(predicted_daily * 7).astype(int)
        # Replace reorder quantity with forecast-informed lead time demand.
        lead_time_multiplier = np.maximum(df["supplier_lead_time_days"], 1.0)
        forecast_reorder = np.ceil(predicted_daily * lead_time_multiplier * 1.25)
        df["suggested_reorder_qty"] = np.maximum(df["suggested_reorder_qty"], forecast_reorder).astype(int)
    else:
        model_name = "heuristic"
        df["forecast_next_7_days"] = np.ceil(df["daily_velocity"] * 7).astype(int)

    # ── Build response ────────────────────────────────────────────────────────
    products = []
    for _, row in df.iterrows():
        products.append({
            "product_id": row["product_id"],
            "product_name": row["product_name"],
            "stock_status": row["stock_status"],
            "current_stock": float(row["current_stock"]),
            "daily_velocity": round(float(row["daily_velocity"]), 3),
            "days_of_stock_remaining": round(float(row["days_of_stock_remaining"]), 1),
            "supplier_lead_time_days": float(row["supplier_lead_time_days"]),
            "reorder_trigger_days": round(float(row["reorder_trigger_days"]), 1),
            "needs_immediate_reorder": bool(row["needs_immediate_reorder"]),
            "suggested_reorder_qty": int(row["suggested_reorder_qty"]),
            "holding_cost_estimate": float(row["holding_cost_estimate"]),
            "anomaly_flag": bool(row["anomaly_flag"]),
            "anomaly_z_score": float(row["anomaly_z_score"]),
            "margin_pct": round(
                (float(row["selling_price"]) - float(row["purchase_price"]))
                / max(float(row["selling_price"]), 0.01)
                * 100,
                1,
            ),
            "forecast_next_7_days": int(row["forecast_next_7_days"]),
            "forecast_model": model_name,
        })

    # ── Summary dashboard counts ──────────────────────────────────────────────
    status_counts = df["stock_status"].value_counts().to_dict()

    return {
        "analysis_date": analysis_date,
        "seasonality": {
            "month": season["month"],
            "weekday": season["weekday"],
            "month_label": datetime(2000, season["month"], 1).strftime("%B"),
            "weekday_label": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                season["weekday"]
            ],
            "month_sin": round(season["month_sin"], 4),
            "month_cos": round(season["month_cos"], 4),
        },
        "summary": {
            "total_products": len(df),
            "critical_low": int(status_counts.get("CRITICAL_LOW", 0)),
            "out_of_stock": int(status_counts.get("OUT_OF_STOCK", 0)),
            "slow_moving": int(status_counts.get("SLOW_MOVING", 0)),
            "overstock": int(status_counts.get("OVERSTOCK", 0)),
            "healthy": int(status_counts.get("HEALTHY", 0)),
            "needs_immediate_reorder": int(df["needs_immediate_reorder"].sum()),
            "anomalies_detected": int(df["anomaly_flag"].sum()),
            "total_holding_cost_estimate": round(float(df["holding_cost_estimate"].sum()), 2),
        },
        "products": products,
    }


# ---------------------------------------------------------------------------
# /customer-risk  (Phase 1 enriched)
# ---------------------------------------------------------------------------


@app.post("/customer-risk")
async def customer_risk(request: CustomerRiskRequest) -> dict[str, Any]:
    """
    Logistic regression risk scoring with Phase 1 new features:
      - credit_utilisation_ratio  (outstanding / credit_limit)
      - return_rate               (credit_notes / invoices, 90-day)
      - existing features retained for backward compatibility
    """
    if not request.customers:
        raise HTTPException(status_code=400, detail="customers list cannot be empty")

    df = pd.DataFrame([c.model_dump() for c in request.customers])

    # ── Phase 1: credit utilisation ───────────────────────────────────────────
    df["credit_utilisation_ratio"] = np.where(
        df["credit_limit"] > 0,
        np.clip(df["outstanding_balance"] / df["credit_limit"], 0, 2.0),
        0.5,   # unknown limit → treat as 50% utilised (neutral)
    )

    # ── Phase 1: return rate ──────────────────────────────────────────────────
    df["return_rate"] = np.where(
        df["invoices_last_90_days"] > 0,
        np.clip(
            df["credit_notes_last_90_days"] / df["invoices_last_90_days"], 0, 1.0
        ),
        0.0,
    )

    # ── Phase 1: seasonality features (month + day_of_week integers) ─────────
    # If last_purchase_date is missing, infer from days_since_last_purchase.
    inferred_dates = []
    for _, row in df.iterrows():
        if row.get("last_purchase_date"):
            try:
                inferred_dates.append(datetime.fromisoformat(row["last_purchase_date"]))
                continue
            except ValueError:
                pass
        inferred_dates.append(datetime.utcnow() - timedelta(days=float(row["days_since_last_purchase"])))
    df["last_purchase_dt"] = inferred_dates
    df["month"] = df["last_purchase_dt"].apply(lambda d: int(d.month))
    df["day_of_week"] = df["last_purchase_dt"].apply(lambda d: int(d.weekday()))

    # ── Feature matrix ────────────────────────────────────────────────────────
    feature_cols = [
        "total_purchases",
        "outstanding_balance",
        "days_since_last_purchase",
        "payment_frequency",
        "average_order_value",
        "total_orders",
        "credit_utilisation_ratio",   # NEW
        "return_rate",                 # NEW
        "month",
        "day_of_week",
    ]

    X = df[feature_cols].fillna(0).values

    # Synthetic risk labels for demo training
    # Production: replace with labelled historical default data
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Heuristic risk label for unsupervised bootstrap
    # High risk if: high utilisation OR high return rate OR long since last purchase
    y = (
        (df["credit_utilisation_ratio"] > 0.75)
        | (df["return_rate"] > 0.15)
        | (df["days_since_last_purchase"] > 60)
    ).astype(int)

    model = LogisticRegression(random_state=42, max_iter=500)

    # Need at least one sample of each class; pad if all same
    unique_classes = np.unique(y)
    if len(unique_classes) < 2:
        logger.warning("All customers have the same risk label — adding synthetic row")
        X_scaled = np.vstack([X_scaled, np.zeros(len(feature_cols))])
        y = np.append(y, 1 - y[0])

    model.fit(X_scaled, y)
    X_full_scaled = scaler.transform(df[feature_cols].fillna(0).values)
    risk_probs = model.predict_proba(X_full_scaled)[:, 1]
    feature_weights = dict(zip(feature_cols, model.coef_[0].tolist()))

    def _tier(score: float) -> str:
        if score < 0.35:
            return "A"
        if score < 0.65:
            return "B"
        return "C"

    def _recommended_limit_action(row: pd.Series, score: float) -> str:
        if score > 0.75 and row["credit_limit"] > 0:
            return "REDUCE_LIMIT"
        if score > 0.65:
            return "MONITOR"
        if score < 0.35 and row["credit_limit"] > 0:
            return "INCREASE_ELIGIBLE"
        return "NO_ACTION"

    customers_out = []
    for i, row in df.iterrows():
        score = float(risk_probs[i])
        contributions = {
            col: float(X_full_scaled[i][idx] * feature_weights[col])
            for idx, col in enumerate(feature_cols)
        }
        top_contributors = [
            f"{name}:{contributions[name]:.3f}"
            for name in sorted(contributions, key=lambda n: abs(contributions[n]), reverse=True)[:3]
        ]
        customers_out.append({
            "customer_id": row["customer_id"],
            "customer_name": row["customer_name"],
            "risk_score": round(score, 4),
            "risk_tier": _tier(score),
            "credit_utilisation_ratio": round(float(row["credit_utilisation_ratio"]), 3),
            "return_rate": round(float(row["return_rate"]), 3),
            "recommended_limit_action": _recommended_limit_action(row, score),
            "risk_factors": _explain_risk(row, score),
            "feature_contributions": top_contributors,
        })

    high_risk = [c for c in customers_out if c["risk_tier"] == "C"]
    reduce_limit = [c for c in customers_out if c["recommended_limit_action"] == "REDUCE_LIMIT"]

    return {
        "summary": {
            "total_customers": len(customers_out),
            "tier_a": sum(1 for c in customers_out if c["risk_tier"] == "A"),
            "tier_b": sum(1 for c in customers_out if c["risk_tier"] == "B"),
            "tier_c": sum(1 for c in customers_out if c["risk_tier"] == "C"),
            "auto_limit_reduction_candidates": len(reduce_limit),
            "avg_credit_utilisation": round(float(df["credit_utilisation_ratio"].mean()), 3),
            "avg_return_rate": round(float(df["return_rate"].mean()), 3),
        },
        "customers": customers_out,
        "auto_actions": {
            "reduce_credit_limit": [
                {"customer_id": c["customer_id"], "customer_name": c["customer_name"],
                 "risk_score": c["risk_score"]}
                for c in reduce_limit
            ],
        },
    }


def _explain_risk(row: pd.Series, score: float) -> list[str]:
    """Return human-readable risk factor strings for the UI."""
    factors = []
    if row["credit_utilisation_ratio"] > 0.75:
        factors.append(f"High credit utilisation ({row['credit_utilisation_ratio']:.0%})")
    if row["return_rate"] > 0.10:
        factors.append(f"Elevated return rate ({row['return_rate']:.0%} in last 90 days)")
    if row["days_since_last_purchase"] > 45:
        factors.append(f"Inactive for {int(row['days_since_last_purchase'])} days")
    if row["outstanding_balance"] > row["average_order_value"] * 3:
        factors.append("Outstanding balance > 3× avg order value")
    if not factors:
        factors.append("Low risk — no significant signals")
    return factors


# ---------------------------------------------------------------------------
# /product-recommendations  (unchanged — Apriori stays for bundles)
# ---------------------------------------------------------------------------


@app.post("/product-recommendations")
async def product_recommendations(request: ProductRecommendationRequest) -> dict[str, Any]:
    if not request.transactions:
        raise HTTPException(status_code=400, detail="transactions cannot be empty")

    te = TransactionEncoder()
    te_array = te.fit_transform(request.transactions)
    basket_df = pd.DataFrame(te_array, columns=te.columns_)

    frequent_items = apriori(
        basket_df,
        min_support=request.min_support,
        use_colnames=True,
    )

    if frequent_items.empty:
        return {"bundles": [], "message": "No frequent itemsets found — lower min_support"}

    rules = association_rules(
        frequent_items, metric="confidence", min_threshold=request.min_confidence
    )

    bundles = []
    for _, rule in rules.sort_values("lift", ascending=False).head(20).iterrows():
        bundles.append({
            "if_customer_buys": sorted(list(rule["antecedents"])),
            "also_recommend": sorted(list(rule["consequents"])),
            "confidence": round(float(rule["confidence"]), 3),
            "lift": round(float(rule["lift"]), 3),
            "support": round(float(rule["support"]), 3),
        })

    return {"bundles": bundles}


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "1.1.0", "phase": "1-signal-enrichment"}
