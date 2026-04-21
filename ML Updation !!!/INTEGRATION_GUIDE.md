# SmartVyapar ML — Phase 1 Integration Guide

## What's in this folder

```
smartvyapar-ml-phase1/
├── ml-service/
│   ├── main.py                  ← Replace your existing ml-service/main.py
│   ├── phase1_migration.sql     ← Run against PostgreSQL (or use Prisma migrate)
│   └── schema_additions.prisma  ← Merge into your schema.prisma
├── src/
│   ├── actions/
│   │   └── stock-prediction.ts  ← Replace your existing version
│   ├── app/dashboard/ml-insights/
│   │   └── page.tsx             ← New route: /dashboard/ml-insights
│   └── components/dashboard/
│       ├── SmartAlertsWidget.tsx  ← Add to your main /dashboard page
│       └── MLInsightsDashboard.tsx ← Client charts (used by the page above)
```

---

## Step 1 — Schema migration (5 minutes)

Add two fields to your Prisma schema:

```prisma
model Supplier {
  // ...existing...
  leadTimeDays  Int  @default(7)   // days between order and delivery
}

model Customer {
  // ...existing...
  creditLimit  Float  @default(0)  // formal credit ceiling (may already exist)
}
```

Then run:

```bash
npx prisma migrate dev --name phase1_ml_signals
npx prisma generate
```

---

## Step 2 — Update the ML service (2 minutes)

Replace `ml-service/main.py` with the provided file, then restart:

```bash
cd ml-service
pip install scipy  # only new dependency — everything else was already there
uvicorn main:app --reload --port 8000
```

**New endpoints are backward-compatible.** All existing fields are preserved;
new fields (`supplier_lead_time_days`, `credit_utilisation_ratio`, etc.) are
additive.

---

## Step 3 — Update the server action (2 minutes)

Replace `src/actions/stock-prediction.ts` with the provided file.

Key changes:
- Pulls `supplier.leadTimeDays` from the Prisma `Product → Supplier` relation
- Pulls `creditNotes` (last 90 days) from the Customer relation
- `applyAutoRiskActions()` is a new exported function — wire to a cron job

---

## Step 4 — Add the Smart Alerts widget to your dashboard (5 minutes)

In your existing `/dashboard/page.tsx` (Server Component):

```tsx
import { getStockInsights, getCustomerRiskScores } from "@/actions/stock-prediction";
import { SmartAlertsWidget } from "@/components/dashboard/SmartAlertsWidget";

export default async function DashboardPage() {
  const session = await auth();
  const [insights, risk] = await Promise.all([
    getStockInsights(session.user.businessId),
    getCustomerRiskScores(session.user.businessId),
  ]);

  return (
    <div>
      {/* Add this widget near the top of your dashboard */}
      <SmartAlertsWidget insights={insights} risk={risk} />

      {/* ...rest of your existing dashboard... */}
    </div>
  );
}
```

---

## Step 5 — Add the ML Insights page (already done)

The file `src/app/dashboard/ml-insights/page.tsx` creates the route
`/dashboard/ml-insights` automatically via Next.js App Router.

Add it to your sidebar navigation:

```tsx
{ label: "ML Insights", href: "/dashboard/ml-insights", icon: <BrainIcon /> }
```

---

## Step 6 — Wire up the auto-action cron job (optional but recommended)

Create `src/app/api/ml/apply-risk-actions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { applyAutoRiskActions } from "@/actions/stock-prediction";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await applyAutoRiskActions(session.user.businessId);
  return NextResponse.json(result);
}
```

Then in `vercel.json` (or your cron system):

```json
{
  "crons": [
    {
      "path": "/api/ml/apply-risk-actions",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This runs every morning at 9 AM, automatically reducing credit limits for
high-risk customers identified by the ML model overnight.

---

## New signals at a glance

| Signal | Source in Prisma | How it's used |
|---|---|---|
| `supplier_lead_time_days` | `Supplier.leadTimeDays` | Reorder fires before stockout |
| `safety_stock` | Computed: 50% of lead-time demand | Padded reorder quantity |
| `credit_utilisation_ratio` | `Customer.outstanding / creditLimit` | Risk model feature |
| `return_rate` | `CreditNote count / Invoice count` (90d) | Risk model feature |
| `anomaly_flag` | Z-score > 2.0 on daily velocity | Theft/error detection |
| `holding_cost_estimate` | Excess stock × purchase price × 2% | Liquidation prioritisation |

---

## Testing the ML service directly

```bash
# Stock insights with lead time
curl -X POST http://localhost:8000/stock-insights \
  -H "Content-Type: application/json" \
  -d '{
    "sales_data": [
      {
        "product_id": "p1",
        "product_name": "Bisleri 1L",
        "quantity_sold": 120,
        "sale_date": "2024-03-01",
        "current_stock": 30,
        "purchase_price": 12,
        "selling_price": 20,
        "supplier_lead_time_days": 5
      }
    ]
  }'

# Customer risk with new signals
curl -X POST http://localhost:8000/customer-risk \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [
      {
        "customer_id": "c1",
        "customer_name": "Raj Stores",
        "total_purchases": 50000,
        "outstanding_balance": 18000,
        "days_since_last_purchase": 25,
        "payment_frequency": 30,
        "average_order_value": 5000,
        "total_orders": 10,
        "credit_limit": 20000,
        "invoices_last_90_days": 8,
        "credit_notes_last_90_days": 2
      }
    ]
  }'
```
