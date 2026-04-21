# SmartVyapar Feature audit vs marketing & execution roadmap

This document maps the **landing page feature claims** ([`src/app/page.tsx`](../src/app/page.tsx)) to what exists in code today, and lists **gaps** plus a **phased plan** to close them without over-promising.
Last sync with landing statuses: **2026-04-17**.

## Legend

| Status | Meaning |
|--------|---------|
| **Done** | Implemented end-to-end in product UI + server actions |
| **Partial** | Exists but limited, demo/mock, or not wired everywhere |
| **Gap** | Not implemented or only marketing copy |

---

## 1. Professional Billing & Invoicing

| Claim | Status | Where it lives / notes |
|-------|--------|------------------------|
| GST-compliant invoices | **Partial** | PDF generation in [`src/lib/invoice-utils.ts`](../src/lib/invoice-utils.ts); GST fields depend on data entry. Tax compliance screens (e.g. [`src/app/dashboard/tax-one/page.tsx`](../src/app/dashboard/tax-one/page.tsx)) mix real exports with placeholder rows in places. |
| Multiple payment modes | **Done** | Invoice model + POS / invoice flows (`paymentMode`). |
| Discounts | **Partial** | `InvoiceData.discount` supported in PDF math in [`invoice-utils`](../src/lib/invoice-utils.ts); verify POS/invoice forms always pass it through. |
| Partial payments | **Partial** | `partialPayment` on `InvoiceData` in [`invoice-utils`](../src/lib/invoice-utils.ts); ensure create/update invoice actions persist `paidAmount` / partial state consistently. |
| Credit sales | **Done** | `CREDIT` mode updates customer `balance` in [`src/actions/invoice.ts`](../src/actions/invoice.ts). |
| Export PDF | **Done** | Client PDF via jsPDF; server PDF for WhatsApp in [`src/actions/communication.ts`](../src/actions/communication.ts). |
| Export Excel | **Partial** | CSV exports on invoices/collections; reusable [`src/components/dashboard/export-button.tsx`](../src/components/dashboard/export-button.tsx) supports `.xlsx` where used. Not every screen uses Excel. |
| WhatsApp | **Done** | Manual flow + optional Meta in [`src/lib/whatsapp.ts`](../src/lib/whatsapp.ts), [`src/actions/communication.ts`](../src/actions/communication.ts), reminders. |

**Next steps (execute in order)**

1. Audit POS + invoice create payloads: ensure `discount` and `partialPayment` are saved on `Invoice` if you rely on them for accounting.
2. Replace any **placeholder** tax/export rows with queries from Prisma.
3. Standardize exports: one pattern (CSV vs XLSX) per module using `ExportButton` or shared helper.

---

## 2. Multi-Godown Inventory Management

| Claim | Status | Where it lives / notes |
|-------|--------|------------------------|
| Multi-godown stock | **Done** | `Stock` model, [`src/actions/inventory.ts`](../src/actions/inventory.ts), [`src/actions/godown.ts`](../src/actions/godown.ts). |
| Real-time levels | **Done** | UI refresh after actions; not websocket-based. |
| Transfer between godowns | **Done** | `transferStockAction`, [`src/components/inventory/stock-transfer.tsx`](../src/components/inventory/stock-transfer.tsx). |
| Reorder points | **Partial** | `minStock`, `reorderQuantity` on `Product`; restock UI [`src/app/dashboard/inventory/restock/page.tsx`](../src/app/dashboard/inventory/restock/page.tsx); ML suggestions in [`src/actions/stock-prediction.ts`](../src/actions/stock-prediction.ts) when service is up. |
| Low stock by location | **Partial** | Godown stats/low counts in [`src/actions/godown.ts`](../src/actions/godown.ts); global low stock often uses **total** `product.stock` ù align messaging with ùper godownù where needed. |

**Next steps**

1. For each report, label clearly: **company-wide** vs **godown-specific** quantity.
2. Optional: background job to alert when `Stock.quantity` per godown &lt; threshold (not only product total).

---

## 3. Payment Tracking & Collections

| Claim | Status | Where it lives / notes |
|-------|--------|------------------------|
| Outstanding tracking | **Done** | Collections dashboard, customer `balance`, invoices. |
| WhatsApp reminders | **Done** | [`src/actions/reminder.ts`](../src/actions/reminder.ts), manual download flow. |
| Credit limits | **Done** | `CustomerCredit` is now kept in sync with canonical `Customer.balance` across invoice/payment update paths. |
| Dashboards | **Done** | Analytics Pro and collections are backed by live Prisma data with scoped period exports. |

**Next steps**

1. Single source of truth: document whether **outstanding** is `Customer.balance`, `CustomerCredit.currentBalance`, or derived from invoices ù then align writes.
2. Replace mock analytics tiles with Prisma aggregates or mark UI as ùsampleù until wired.

---

## 4. Stock Reports & Analytics

| Claim | Status | Where it lives / notes |
|-------|--------|------------------------|
| Godown-wise / category / low-stock | **Done** | [`src/app/dashboard/reports/stock/page.tsx`](../src/app/dashboard/reports/stock/page.tsx). |
| Movement reports | **Partial** | Depends on stock ledger / transfers; not a full immutable movement audit log unless you add `StockMovement` events everywhere. |
| Valuation | **Partial** | Reports use `costPrice` or fallback; document formula. |
| Aging analysis | **Gap / Partial** | Expiry tracking exists ([`src/app/dashboard/expiry-tracking/page.tsx`](../src/app/dashboard/expiry-tracking/page.tsx)); **FIFO aging of inventory value** is not the same ù clarify product scope. |
| Turnover ratios | **Partial** | [`src/app/dashboard/analytics-pro/page.tsx`](../src/app/dashboard/analytics-pro/page.tsx) uses mock turnover unless replaced. |

**Next steps**

1. Define **movement**: either append-only `StockMovement` table + migration, or document that ùmovementù = transfers + invoices only.
2. Implement turnover from **COGS / average inventory** from real invoice + stock data, or remove from marketing until computed.

---

## 5. Route Optimization & Delivery

| Claim | Status | Where it lives / notes |
|-------|--------|------------------------|
| Route planning | **Partial** | [`src/actions/trip.ts`](../src/actions/trip.ts) uses **nearest-neighbor** ordering from a start point ù not full OR-Tools/TSP, but a real heuristic. |
| Real-time tracking | **Partial** | Trips UI ([`src/app/dashboard/trips/page.tsx`](../src/app/dashboard/trips/page.tsx)) ù verify GPS updates vs demo coords. |
| Fuel / efficiency | **Gap** | Not automatically calculated unless added from distance + vehicle data. |

**Next steps**

1. Marketing copy: say **ùroute sequencingù** or **ùnearest-stop orderingù** unless you upgrade optimization.
2. Optional: integrate Maps Directions API for true road distance and ordered waypoints.

---

## 6. Customer Management

| Claim | Status | Where it lives / notes |
|-------|--------|------------------------|
| Location insights | **Partial** | Customer `lat`/`lng`, maps on customer pages; beats/visits modules. |
| Payment history | **Partial** | Invoices + collections; dedicated statement PDF ù confirm if unified ùstatementù export exists. |
| Visit planning | **Partial** | [`src/app/dashboard/visits/page.tsx`](../src/app/dashboard/visits/page.tsx), [`src/app/dashboard/beats/page.tsx`](../src/app/dashboard/beats/page.tsx). |
| Customer statements | **Done** | Customer statement CSV/PDF export available from customer pages and customer list cards. |

**Next steps**

1. One-click **statement**: query open invoices + payments for customer ? PDF/CSV.
2. Normalize phone/GSTIN on all entry points (server actions already improved in `saveCustomerAction`).

---

## 7. Cross-cutting: AI / ML

| Claim | Status | Notes |
|-------|--------|--------|
| AI-powered insights | **Partial** | ML service + [`src/app/dashboard/ml-insights/page.tsx`](../src/app/dashboard/ml-insights/page.tsx); requires `ML_SERVICE_URL` / env and running Python service. |

---

## Phased execution plan (recommended)

### Phase A ù Honesty & UX (1ù3 days)

- Update landing copy OR add tooltips: mark **ùcoming soonù** only where still mock (e.g. parts of analytics-pro, tax-one placeholders).
- Add a **Features** page or `/docs` link for internal truth vs marketing.

### Phase B ù Data integrity (1ù2 weeks)

- Unify **credit / balance** sources.
- Optional: `StockMovement` ledger for real movement/aging.
- Ensure invoice line items + payments reconcile for statements.

### Phase C ù Depth features (ongoing)

- Stronger route optimization (Directions API + TSP for small N).
- Full **Excel** export parity on invoices if promised.
- Customer **statement** generator.

---

## Quick reference: main dashboard routes

| Area | Route |
|------|--------|
| Invoices | `/dashboard/invoices` |
| Inventory | `/dashboard/inventory` |
| Godowns | `/dashboard/godowns` |
| Stock reports | `/dashboard/reports/stock` |
| Collections | `/dashboard/collections` |
| Trips / delivery | `/dashboard/trips` |
| ML insights | `/dashboard/ml-insights` |
| Customers | `/dashboard/customers` |

This file is the living **execution plan**: tick items as you implement them.
