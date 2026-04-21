"""
SmartVyapar ML Service — Phase 4 AI Insights
FastAPI service providing:
  1. Category-aware product recommendations (Apriori at product + category level)
  2. Slow-moving stock detection & EOQ-based reorder quantities
  3. Payment default risk prediction (Logistic Regression / Random Forest)
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartvyapar-ml")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup logic using the modern lifespan pattern."""
    logger.info("Loading transactions and training models…")
    product_baskets, category_baskets, p2c = _load_transactions(TRANSACTIONS_PATH)
    _model_store["product_to_category"] = p2c
    _model_store["product_rules"] = _build_rules(product_baskets, MIN_SUPPORT, MIN_CONFIDENCE)
    _model_store["category_rules"] = _build_rules(category_baskets, MIN_SUPPORT * 0.5, MIN_CONFIDENCE)
    _model_store["payment_model"] = _train_payment_model("random_forest")
    _model_store["payment_model_type"] = "random_forest"
    logger.info(
        "Startup complete. Product rules: %s, Category rules: %s",
        "loaded" if _model_store["product_rules"] is not None else "none",
        "loaded" if _model_store["category_rules"] is not None else "none",
    )
    yield  # app runs here


app = FastAPI(
    title="SmartVyapar ML Service",
    description="Phase 4 AI-powered insights: recommendations, stock analysis, payment risk",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global model store (loaded once at startup)
# ---------------------------------------------------------------------------

_model_store: dict[str, Any] = {
    "product_rules": None,       # DataFrame of product-level association rules
    "category_rules": None,      # DataFrame of category-level association rules
    "product_to_category": {},   # {productId: categoryName}
    "payment_model": None,       # sklearn Pipeline
    "payment_model_type": None,  # "logistic" | "random_forest"
}

TRANSACTIONS_PATH = Path(os.getenv("TRANSACTIONS_PATH", "transactions.json"))
MIN_SUPPORT = float(os.getenv("MIN_SUPPORT", "0.01"))
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", "0.3"))
MIN_LIFT = float(os.getenv("MIN_LIFT", "1.1"))

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

# ── Recommendations ─────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    product_ids: list[str] = Field(..., description="Products currently in the cart / recently purchased")
    top_n: int = Field(5, ge=1, le=20)
    include_category_recommendations: bool = Field(True)

class ProductRecommendation(BaseModel):
    product_id: str
    confidence: float
    lift: float
    category: str | None = None

class CategoryRecommendation(BaseModel):
    category: str
    confidence: float
    lift: float

class RecommendResponse(BaseModel):
    product_recommendations: list[ProductRecommendation]
    category_recommendations: list[CategoryRecommendation]
    based_on_products: list[str]


# ── Stock Insights ───────────────────────────────────────────────────────────

class ProductStockInput(BaseModel):
    product_id: str
    product_name: str
    category: str | None = None
    current_stock: float = Field(..., ge=0, description="Units currently on hand")
    velocity_30d: float = Field(..., ge=0, description="Average units sold per day over last 30 days")
    lead_time_days: int = Field(..., ge=1, description="Supplier lead time in days")
    unit_cost: float = Field(0.0, ge=0, description="Cost per unit (₹). Used for EOQ; can be 0 to skip cost optimisation.")
    ordering_cost: float = Field(100.0, ge=0, description="Fixed cost per order (₹)")
    holding_cost_rate: float = Field(0.25, ge=0.01, le=1.0, description="Annual holding cost as fraction of unit cost")
    safety_stock_factor: float = Field(1.645, description="Z-score for desired service level (1.645 = 95%)")
    velocity_std_dev: float | None = Field(None, description="Std dev of daily demand; estimated if not provided")


class StockInsightResult(BaseModel):
    product_id: str
    product_name: str
    category: str | None
    status: str                         # "slow_moving" | "healthy" | "critical_low" | "overstock"
    days_of_stock_remaining: float
    suggested_reorder_qty: float
    reorder_point: float
    safety_stock: float
    eoq: float | None
    insight_message: str


class StockInsightsRequest(BaseModel):
    products: list[ProductStockInput]


class StockInsightsResponse(BaseModel):
    results: list[StockInsightResult]
    summary: dict[str, int]


# ── Payment Default Prediction ───────────────────────────────────────────────

class CustomerPaymentInput(BaseModel):
    customer_id: str
    customer_name: str
    current_balance: float = Field(..., description="Outstanding balance in ₹")
    avg_days_past_due: float = Field(0.0, ge=0, description="Average days invoices are paid late")
    total_invoices: int = Field(..., ge=1)
    paid_on_time_count: int = Field(0, ge=0)
    max_days_past_due: float = Field(0.0, ge=0)
    credit_limit: float = Field(0.0, ge=0)


class PaymentDefaultResult(BaseModel):
    customer_id: str
    customer_name: str
    risk_score: float = Field(..., description="Risk probability 0–100%")
    high_risk: bool
    risk_tier: str                       # "low" | "medium" | "high" | "critical"
    key_drivers: list[str]
    recommended_action: str


class PredictPaymentDefaultRequest(BaseModel):
    customers: list[CustomerPaymentInput]
    model_preference: str = Field("auto", description="'logistic', 'random_forest', or 'auto'")


class PredictPaymentDefaultResponse(BaseModel):
    results: list[PaymentDefaultResult]
    model_used: str
    summary: dict[str, int]


# ---------------------------------------------------------------------------
# Helper — load & train from transactions.json
# ---------------------------------------------------------------------------

def _load_transactions(path: Path) -> tuple[list[list[str]], list[list[str]], dict[str, str]]:
    """
    Parse transactions.json.

    Expected format (flexible):
      [
        {
          "transactionId": "T001",
          "items": [
            {"productId": "P1", "productName": "Milk", "category": "Dairy"},
            ...
          ]
        },
        ...
      ]

    Returns:
        product_baskets  — list of lists of productIds per transaction
        category_baskets — list of lists of category names per transaction
        product_to_category — mapping {productId: categoryName}
    """
    if not path.exists():
        logger.warning("transactions.json not found at %s — using empty dataset", path)
        return [], [], {}

    with open(path) as f:
        data = json.load(f)

    product_baskets: list[list[str]] = []
    category_baskets: list[list[str]] = []
    product_to_category: dict[str, str] = {}

    for txn in data:
        items = txn.get("items", [])
        p_ids: list[str] = []
        cats: list[str] = []
        for item in items:
            pid = item.get("productId") or item.get("product_id")
            cat = item.get("category") or item.get("productCategory") or "Uncategorised"
            if pid:
                p_ids.append(str(pid))
                cats.append(str(cat))
                product_to_category[str(pid)] = str(cat)
        if p_ids:
            product_baskets.append(p_ids)
            category_baskets.append(list(dict.fromkeys(cats)))  # deduplicate categories per txn

    return product_baskets, category_baskets, product_to_category


def _build_rules(baskets: list[list[str]], min_support: float, min_confidence: float) -> pd.DataFrame | None:
    """Run Apriori and return association rules DataFrame, or None if insufficient data."""
    if len(baskets) < 5:
        return None
    try:
        te = TransactionEncoder()
        te_array = te.fit_transform(baskets)
        df = pd.DataFrame(te_array, columns=te.columns_)
        freq = apriori(df, min_support=min_support, use_colnames=True)
        if freq.empty:
            return None
        rules = association_rules(freq, metric="confidence", min_threshold=min_confidence)
        rules = rules[rules["lift"] >= MIN_LIFT].sort_values("lift", ascending=False)
        return rules
    except Exception as exc:
        logger.warning("Apriori failed: %s", exc)
        return None


def _train_payment_model(model_type: str = "random_forest") -> Pipeline:
    """
    Build a synthetic-data-bootstrapped payment default model.

    In production, replace the synthetic training data below with real ledger
    history loaded from your database. The feature engineering and pipeline
    contract remain the same.
    """
    rng = np.random.default_rng(42)
    n = 500

    # Synthetic training data (replace with real historical records)
    current_balance = rng.exponential(scale=50_000, size=n)
    avg_dpd = rng.exponential(scale=15, size=n)
    total_invoices = rng.integers(1, 200, size=n)
    paid_on_time = rng.integers(0, total_invoices + 1)
    max_dpd = avg_dpd + rng.exponential(scale=10, size=n)
    credit_limit = rng.exponential(scale=100_000, size=n)

    on_time_ratio = paid_on_time / total_invoices
    utilisation = np.clip(current_balance / (credit_limit + 1), 0, 5)

    # Heuristic label: high balance + high DPD + low on-time ratio → default
    default_prob = (
        0.3 * np.clip(avg_dpd / 60, 0, 1)
        + 0.3 * np.clip(utilisation, 0, 1)
        + 0.2 * (1 - on_time_ratio)
        + 0.2 * np.clip(max_dpd / 90, 0, 1)
    )
    y = (rng.random(n) < default_prob).astype(int)

    X = np.column_stack([
        current_balance,
        avg_dpd,
        total_invoices,
        on_time_ratio,
        max_dpd,
        utilisation,
    ])

    if model_type == "logistic":
        estimator = LogisticRegression(max_iter=1000, class_weight="balanced")
    else:
        estimator = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", estimator),
    ])
    pipeline.fit(X, y)
    logger.info("Payment default model (%s) trained on %d synthetic records.", model_type, n)
    return pipeline


# ---------------------------------------------------------------------------
# Endpoint: POST /train  (re-train on demand)
# ---------------------------------------------------------------------------

@app.post("/train", summary="Re-train all models from transactions.json")
async def train(model_preference: str = "random_forest"):
    """
    Re-trains recommendation and payment models.
    Call this after bulk-importing new transaction data.
    """
    product_baskets, category_baskets, p2c = _load_transactions(TRANSACTIONS_PATH)
    _model_store["product_to_category"] = p2c
    _model_store["product_rules"] = _build_rules(product_baskets, MIN_SUPPORT, MIN_CONFIDENCE)
    _model_store["category_rules"] = _build_rules(category_baskets, MIN_SUPPORT * 0.5, MIN_CONFIDENCE)
    _model_store["payment_model"] = _train_payment_model(model_preference)
    _model_store["payment_model_type"] = model_preference
    return {
        "status": "ok",
        "product_rules_count": len(_model_store["product_rules"]) if _model_store["product_rules"] is not None else 0,
        "category_rules_count": len(_model_store["category_rules"]) if _model_store["category_rules"] is not None else 0,
        "payment_model": model_preference,
    }


# ---------------------------------------------------------------------------
# Endpoint: POST /recommendations
# ---------------------------------------------------------------------------

@app.post("/recommendations", response_model=RecommendResponse, summary="Category-aware product recommendations")
async def recommendations(req: RecommendRequest):
    """
    Given a set of product IDs (e.g. current cart), return:
    - Product-level recommendations (via Apriori association rules)
    - Category-level recommendations (e.g. "Customers who buy Snacks often buy Beverages")
    """
    product_rules: pd.DataFrame | None = _model_store["product_rules"]
    category_rules: pd.DataFrame | None = _model_store["category_rules"]
    p2c: dict[str, str] = _model_store["product_to_category"]

    antecedent_set = frozenset(req.product_ids)

    # ── Product recommendations ──────────────────────────────────────────────
    product_recs: list[ProductRecommendation] = []
    if product_rules is not None and not product_rules.empty:
        for _, row in product_rules.iterrows():
            if row["antecedents"].issubset(antecedent_set):
                for pid in row["consequents"]:
                    if pid not in antecedent_set:
                        product_recs.append(ProductRecommendation(
                            product_id=pid,
                            confidence=round(float(row["confidence"]), 4),
                            lift=round(float(row["lift"]), 4),
                            category=p2c.get(pid),
                        ))
        # Deduplicate keeping highest confidence per product
        seen: dict[str, ProductRecommendation] = {}
        for r in sorted(product_recs, key=lambda x: x.confidence, reverse=True):
            if r.product_id not in seen:
                seen[r.product_id] = r
        product_recs = list(seen.values())[: req.top_n]

    # ── Category recommendations ─────────────────────────────────────────────
    cat_recs: list[CategoryRecommendation] = []
    if req.include_category_recommendations and category_rules is not None and not category_rules.empty:
        input_categories = frozenset(p2c.get(pid, "Uncategorised") for pid in req.product_ids)
        seen_cats: dict[str, CategoryRecommendation] = {}
        for _, row in category_rules.iterrows():
            if row["antecedents"].issubset(input_categories):
                for cat in row["consequents"]:
                    if cat not in input_categories and cat not in seen_cats:
                        seen_cats[cat] = CategoryRecommendation(
                            category=cat,
                            confidence=round(float(row["confidence"]), 4),
                            lift=round(float(row["lift"]), 4),
                        )
        cat_recs = sorted(seen_cats.values(), key=lambda x: x.confidence, reverse=True)[: req.top_n]

    return RecommendResponse(
        product_recommendations=product_recs,
        category_recommendations=cat_recs,
        based_on_products=req.product_ids,
    )


# ---------------------------------------------------------------------------
# Endpoint: POST /stock-insights
# ---------------------------------------------------------------------------

def _eoq(annual_demand: float, ordering_cost: float, unit_cost: float, holding_rate: float) -> float | None:
    """Wilson EOQ formula. Returns None if inputs are degenerate."""
    holding_cost_unit = unit_cost * holding_rate
    if annual_demand <= 0 or ordering_cost <= 0 or holding_cost_unit <= 0:
        return None
    return round(((2 * annual_demand * ordering_cost) / holding_cost_unit) ** 0.5, 1)


@app.post("/stock-insights", response_model=StockInsightsResponse, summary="Slow-moving stock & EOQ reorder quantities")
async def stock_insights(req: StockInsightsRequest):
    """
    For each product, classify its stock status and calculate:
    - Safety stock
    - Reorder point (ROP)
    - EOQ-based suggested reorder quantity
    """
    results: list[StockInsightResult] = []
    status_counter: dict[str, int] = {"slow_moving": 0, "healthy": 0, "critical_low": 0, "overstock": 0}

    for p in req.products:
        velocity = p.velocity_30d  # units/day
        stock = p.current_stock
        lead = p.lead_time_days

        # Estimate std dev if not provided (assume 30% CV of velocity)
        sigma = p.velocity_std_dev if p.velocity_std_dev is not None else max(velocity * 0.3, 0.01)

        # Safety stock = Z * sigma * sqrt(lead time)
        safety_stock = round(p.safety_stock_factor * sigma * (lead ** 0.5), 1)

        # Reorder point = (avg demand × lead time) + safety stock
        rop = round(velocity * lead + safety_stock, 1)

        # Days of stock remaining
        days_remaining = round(stock / velocity, 1) if velocity > 0 else float("inf")

        # EOQ
        annual_demand = velocity * 365
        eoq = _eoq(annual_demand, p.ordering_cost, p.unit_cost, p.holding_cost_rate)

        # Suggested reorder qty: EOQ if available, else 30-day demand, min 1
        suggested_qty = eoq if eoq else round(max(velocity * 30, 1), 1)

        # Classify status
        SLOW_MOVING_THRESHOLD = 0.1  # units/day
        CRITICAL_DAYS = lead + 3      # will run out before next order arrives

        if velocity < SLOW_MOVING_THRESHOLD and stock > 30:
            status = "slow_moving"
            msg = (
                f"Only {velocity:.2f} units/day velocity. Consider a promotional offer "
                f"or markdown to clear {stock:.0f} units before they become dead stock."
            )
        elif days_remaining < CRITICAL_DAYS:
            status = "critical_low"
            msg = (
                f"Stock will last ~{days_remaining:.0f} days — less than your {lead}-day lead time. "
                f"Place an urgent order of {suggested_qty:.0f} units immediately."
            )
        elif days_remaining > 120 and velocity < SLOW_MOVING_THRESHOLD * 5:
            status = "overstock"
            msg = (
                f"Over 120 days of stock on hand at current velocity ({velocity:.2f} units/day). "
                f"Pause replenishment until stock drops below ROP ({rop:.0f} units)."
            )
        else:
            status = "healthy"
            msg = f"Stock is healthy. Reorder when stock drops to {rop:.0f} units (ROP)."

        status_counter[status] += 1

        results.append(StockInsightResult(
            product_id=p.product_id,
            product_name=p.product_name,
            category=p.category,
            status=status,
            days_of_stock_remaining=days_remaining,
            suggested_reorder_qty=suggested_qty,
            reorder_point=rop,
            safety_stock=safety_stock,
            eoq=eoq,
            insight_message=msg,
        ))

    # Sort: critical first, then slow-moving, then overstock, then healthy
    order = {"critical_low": 0, "slow_moving": 1, "overstock": 2, "healthy": 3}
    results.sort(key=lambda r: order.get(r.status, 9))

    return StockInsightsResponse(results=results, summary=status_counter)


# ---------------------------------------------------------------------------
# Endpoint: POST /predict-payment-default
# ---------------------------------------------------------------------------

def _feature_vector(c: CustomerPaymentInput) -> list[float]:
    on_time_ratio = c.paid_on_time_count / max(c.total_invoices, 1)
    utilisation = c.current_balance / max(c.credit_limit, 1) if c.credit_limit > 0 else 0.0
    return [
        c.current_balance,
        c.avg_days_past_due,
        c.total_invoices,
        on_time_ratio,
        c.max_days_past_due,
        utilisation,
    ]


def _risk_tier(score: float) -> str:
    if score < 25:
        return "low"
    if score < 50:
        return "medium"
    if score < 75:
        return "high"
    return "critical"


def _key_drivers(c: CustomerPaymentInput, score: float) -> list[str]:
    drivers: list[str] = []
    on_time_ratio = c.paid_on_time_count / max(c.total_invoices, 1)
    utilisation = c.current_balance / max(c.credit_limit, 1) if c.credit_limit > 0 else 0.0

    if c.avg_days_past_due > 30:
        drivers.append(f"Avg {c.avg_days_past_due:.0f} days past due")
    if on_time_ratio < 0.6:
        drivers.append(f"Only {on_time_ratio*100:.0f}% invoices paid on time")
    if utilisation > 0.8:
        drivers.append(f"Credit utilisation at {utilisation*100:.0f}%")
    if c.max_days_past_due > 60:
        drivers.append(f"Worst-case {c.max_days_past_due:.0f} days overdue on record")
    if c.current_balance > 100_000:
        drivers.append(f"High outstanding balance ₹{c.current_balance:,.0f}")
    return drivers or ["No major red flags detected"]


def _action(tier: str) -> str:
    return {
        "low": "Continue standard credit terms. Monitor quarterly.",
        "medium": "Send payment reminder. Consider reducing credit limit by 20%.",
        "high": "Block new credit. Escalate to collections team. Require advance payment.",
        "critical": "Immediate escalation. Initiate legal notice if balance unpaid within 7 days.",
    }[tier]


@app.post(
    "/predict-payment-default",
    response_model=PredictPaymentDefaultResponse,
    summary="Predict payment default risk for debtors",
)
async def predict_payment_default(req: PredictPaymentDefaultRequest):
    """
    Returns a risk score (0–100%), risk tier (low/medium/high/critical),
    key drivers, and recommended action for each customer.
    """
    model: Pipeline | None = _model_store["payment_model"]
    model_type: str = _model_store["payment_model_type"] or "random_forest"

    # Lazy-init: if startup was skipped (e.g. TestClient), train now
    if model is None:
        model = _train_payment_model(model_type)
        _model_store["payment_model"] = model

    # Auto-select based on number of customers (logistic for small batches, RF for large)
    if req.model_preference == "auto":
        pass  # use whatever was trained at startup
    elif req.model_preference != model_type:
        # Caller explicitly requested a different model — retrain on the fly
        try:
            model = _train_payment_model(req.model_preference)
            _model_store["payment_model"] = model
            _model_store["payment_model_type"] = req.model_preference
            model_type = req.model_preference
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Model training failed: {exc}") from exc

    if model is None:
        raise HTTPException(status_code=503, detail="Payment model could not be initialised.")

    X = np.array([_feature_vector(c) for c in req.customers])
    proba = model.predict_proba(X)[:, 1]  # probability of default class

    results: list[PaymentDefaultResult] = []
    tier_counter: dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}

    for customer, raw_score in zip(req.customers, proba):
        score = round(float(raw_score) * 100, 1)
        tier = _risk_tier(score)
        tier_counter[tier] += 1
        results.append(PaymentDefaultResult(
            customer_id=customer.customer_id,
            customer_name=customer.customer_name,
            risk_score=score,
            high_risk=score >= 50,
            risk_tier=tier,
            key_drivers=_key_drivers(customer, score),
            recommended_action=_action(tier),
        ))

    results.sort(key=lambda r: r.risk_score, reverse=True)

    return PredictPaymentDefaultResponse(
        results=results,
        model_used=model_type,
        summary=tier_counter,
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "product_rules_loaded": _model_store["product_rules"] is not None,
        "category_rules_loaded": _model_store["category_rules"] is not None,
        "payment_model_loaded": _model_store["payment_model"] is not None,
        "payment_model_type": _model_store["payment_model_type"],
    }
