"""
SmartVyapar ML Service — Automated Tests
Run with:  pytest tests/test_ml_service.py -v
"""

import pytest
from fastapi.testclient import TestClient

# ── Bootstrap: point at the test transactions file before importing app ──────
import os, sys
from pathlib import Path

os.environ["TRANSACTIONS_PATH"] = str(Path(__file__).parent.parent / "ml-service" / "transactions.json")
sys.path.insert(0, str(Path(__file__).parent.parent / "ml-service"))

from main import app  # noqa: E402  (import after env setup)

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "payment_model_loaded" in body


# ─────────────────────────────────────────────────────────────────────────────
# /recommendations
# ─────────────────────────────────────────────────────────────────────────────

def test_recommendations_returns_structure():
    r = client.post("/recommendations", json={
        "product_ids": ["P001", "P002"],
        "top_n": 5,
        "include_category_recommendations": True,
    })
    assert r.status_code == 200
    body = r.json()
    assert "product_recommendations" in body
    assert "category_recommendations" in body
    assert body["based_on_products"] == ["P001", "P002"]


def test_recommendations_empty_product_list():
    """Empty cart should return empty recs without crashing."""
    r = client.post("/recommendations", json={
        "product_ids": [],
        "top_n": 5,
        "include_category_recommendations": True,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["product_recommendations"] == []


def test_recommendations_unknown_products():
    """Unknown product IDs should return empty recs gracefully."""
    r = client.post("/recommendations", json={
        "product_ids": ["UNKNOWN_XYZ"],
        "top_n": 3,
        "include_category_recommendations": True,
    })
    assert r.status_code == 200


def test_recommendations_top_n_respected():
    r = client.post("/recommendations", json={
        "product_ids": ["P001"],
        "top_n": 2,
        "include_category_recommendations": False,
    })
    assert r.status_code == 200
    body = r.json()
    assert len(body["product_recommendations"]) <= 2


# ─────────────────────────────────────────────────────────────────────────────
# /stock-insights
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_PRODUCTS = [
    {
        "product_id": "P001",
        "product_name": "Amul Milk 1L",
        "category": "Dairy",
        "current_stock": 200,
        "velocity_30d": 0.05,   # slow-moving
        "lead_time_days": 3,
        "unit_cost": 60.0,
        "ordering_cost": 150.0,
        "holding_cost_rate": 0.25,
    },
    {
        "product_id": "P002",
        "product_name": "Britannia Bread",
        "category": "Bakery",
        "current_stock": 5,
        "velocity_30d": 3.0,    # critical low
        "lead_time_days": 2,
        "unit_cost": 40.0,
        "ordering_cost": 100.0,
        "holding_cost_rate": 0.25,
    },
    {
        "product_id": "P003",
        "product_name": "Lay's Chips",
        "category": "Snacks",
        "current_stock": 50,
        "velocity_30d": 1.5,    # healthy
        "lead_time_days": 4,
        "unit_cost": 20.0,
        "ordering_cost": 80.0,
        "holding_cost_rate": 0.25,
    },
]


def test_stock_insights_basic():
    r = client.post("/stock-insights", json={"products": SAMPLE_PRODUCTS})
    assert r.status_code == 200
    body = r.json()
    assert len(body["results"]) == 3
    assert "summary" in body


def test_stock_insights_slow_moving_flagged():
    r = client.post("/stock-insights", json={"products": [SAMPLE_PRODUCTS[0]]})
    body = r.json()
    result = body["results"][0]
    assert result["status"] == "slow_moving"
    assert result["days_of_stock_remaining"] > 0
    assert result["suggested_reorder_qty"] > 0


def test_stock_insights_critical_low_flagged():
    r = client.post("/stock-insights", json={"products": [SAMPLE_PRODUCTS[1]]})
    body = r.json()
    result = body["results"][0]
    assert result["status"] == "critical_low"


def test_stock_insights_eoq_computed():
    """EOQ should be a positive number when unit_cost > 0."""
    r = client.post("/stock-insights", json={"products": [SAMPLE_PRODUCTS[2]]})
    body = r.json()
    result = body["results"][0]
    assert result["eoq"] is not None
    assert result["eoq"] > 0


def test_stock_insights_zero_velocity_does_not_crash():
    product = {**SAMPLE_PRODUCTS[0], "velocity_30d": 0.0}
    r = client.post("/stock-insights", json={"products": [product]})
    assert r.status_code == 200


def test_stock_insights_reorder_point_formula():
    """ROP = velocity × lead_time + safety_stock. Verify it's non-negative."""
    r = client.post("/stock-insights", json={"products": SAMPLE_PRODUCTS})
    body = r.json()
    for result in body["results"]:
        assert result["reorder_point"] >= 0
        assert result["safety_stock"] >= 0


def test_stock_insights_summary_counts_match():
    r = client.post("/stock-insights", json={"products": SAMPLE_PRODUCTS})
    body = r.json()
    total = sum(body["summary"].values())
    assert total == len(SAMPLE_PRODUCTS)


# ─────────────────────────────────────────────────────────────────────────────
# /predict-payment-default
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_CUSTOMERS = [
    {
        "customer_id": "C001",
        "customer_name": "Rajan Stores",
        "current_balance": 150000,
        "avg_days_past_due": 60,
        "total_invoices": 40,
        "paid_on_time_count": 8,
        "max_days_past_due": 120,
        "credit_limit": 100000,
    },
    {
        "customer_id": "C002",
        "customer_name": "Meena Traders",
        "current_balance": 5000,
        "avg_days_past_due": 2,
        "total_invoices": 50,
        "paid_on_time_count": 48,
        "max_days_past_due": 5,
        "credit_limit": 200000,
    },
]


def test_payment_default_scores_in_range():
    r = client.post("/predict-payment-default", json={
        "customers": SAMPLE_CUSTOMERS,
        "model_preference": "auto",
    })
    assert r.status_code == 200
    body = r.json()
    for result in body["results"]:
        assert 0 <= result["risk_score"] <= 100


def test_payment_default_high_risk_flag():
    r = client.post("/predict-payment-default", json={
        "customers": SAMPLE_CUSTOMERS,
        "model_preference": "auto",
    })
    body = r.json()
    rajan = next(c for c in body["results"] if c["customer_id"] == "C001")
    meena = next(c for c in body["results"] if c["customer_id"] == "C002")
    # Rajan has much worse metrics — should score higher
    assert rajan["risk_score"] > meena["risk_score"]


def test_payment_default_risk_tier_values():
    r = client.post("/predict-payment-default", json={
        "customers": SAMPLE_CUSTOMERS,
        "model_preference": "auto",
    })
    body = r.json()
    valid_tiers = {"low", "medium", "high", "critical"}
    for result in body["results"]:
        assert result["risk_tier"] in valid_tiers


def test_payment_default_key_drivers_non_empty():
    r = client.post("/predict-payment-default", json={
        "customers": SAMPLE_CUSTOMERS,
        "model_preference": "auto",
    })
    body = r.json()
    for result in body["results"]:
        assert len(result["key_drivers"]) >= 1


def test_payment_default_recommended_action_present():
    r = client.post("/predict-payment-default", json={
        "customers": SAMPLE_CUSTOMERS,
        "model_preference": "auto",
    })
    body = r.json()
    for result in body["results"]:
        assert len(result["recommended_action"]) > 0


def test_payment_default_summary_counts_match():
    r = client.post("/predict-payment-default", json={
        "customers": SAMPLE_CUSTOMERS,
        "model_preference": "auto",
    })
    body = r.json()
    total = sum(body["summary"].values())
    assert total == len(SAMPLE_CUSTOMERS)


def test_payment_default_logistic_model():
    r = client.post("/predict-payment-default", json={
        "customers": SAMPLE_CUSTOMERS,
        "model_preference": "logistic",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["model_used"] == "logistic"


def test_payment_default_single_customer():
    r = client.post("/predict-payment-default", json={
        "customers": [SAMPLE_CUSTOMERS[0]],
        "model_preference": "auto",
    })
    assert r.status_code == 200
    assert len(r.json()["results"]) == 1


# ─────────────────────────────────────────────────────────────────────────────
# /train
# ─────────────────────────────────────────────────────────────────────────────

def test_train_endpoint():
    r = client.post("/train?model_preference=random_forest")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "product_rules_count" in body
    assert "category_rules_count" in body


def test_train_with_logistic():
    r = client.post("/train?model_preference=logistic")
    assert r.status_code == 200
    assert r.json()["payment_model"] == "logistic"
