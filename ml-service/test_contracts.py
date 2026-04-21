from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_stock_insights_contract():
    payload = {
        "sales_data": [
            {
                "product_id": "p1",
                "product_name": "Sample",
                "quantity_sold": 120,
                "sale_date": "2026-04-01",
                "current_stock": 80,
                "purchase_price": 50,
                "selling_price": 65,
                "supplier_lead_time_days": 7,
                "category": "General",
                "recent_daily_sales": [4] * 30,
            }
        ]
    }
    res = client.post("/stock-insights", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert "products" in body
    assert isinstance(body["products"], list)
    assert "summary" in body


def test_customer_risk_contract():
    payload = {
        "customers": [
            {
                "customer_id": "c1",
                "customer_name": "Demo",
                "total_purchases": 50000,
                "outstanding_balance": 20000,
                "days_since_last_purchase": 10,
                "payment_frequency": 12,
                "average_order_value": 3500,
                "total_orders": 14,
                "credit_limit": 60000,
                "invoices_last_90_days": 10,
                "credit_notes_last_90_days": 1,
            },
            {
                "customer_id": "c2",
                "customer_name": "Demo 2",
                "total_purchases": 15000,
                "outstanding_balance": 12000,
                "days_since_last_purchase": 95,
                "payment_frequency": 5,
                "average_order_value": 1200,
                "total_orders": 3,
                "credit_limit": 20000,
                "invoices_last_90_days": 2,
                "credit_notes_last_90_days": 1,
            },
        ]
    }
    res = client.post("/customer-risk", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert "customers" in body
    assert "summary" in body  
