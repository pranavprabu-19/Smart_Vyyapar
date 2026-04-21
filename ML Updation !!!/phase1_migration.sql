-- SmartVyapar Phase 1 — Schema additions
-- Run: npx prisma migrate dev --name phase1_ml_signals
-- Or apply manually against your PostgreSQL database.
--
-- What this adds:
--   Supplier.leadTimeDays     — days between order and delivery
--   Customer.creditLimit      — formal credit limit (may already exist)
--
-- If your schema already has these fields, skip those ALTER statements.

-- ─── Supplier: lead time ───────────────────────────────────────────────────────
ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "leadTimeDays" INTEGER NOT NULL DEFAULT 7;

COMMENT ON COLUMN "Supplier"."leadTimeDays" IS
  'Average number of days between placing an order and receiving delivery. '
  'Used by the ML service to compute reorder trigger thresholds.';

-- ─── Customer: credit limit ────────────────────────────────────────────────────
-- Only add if it does not already exist in your schema.
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0;

COMMENT ON COLUMN "Customer"."creditLimit" IS
  'Maximum credit extended to this customer. '
  'Phase 1 ML uses this to compute credit_utilisation_ratio.';

-- ─── Index for ML query performance ───────────────────────────────────────────
-- The ML action queries StockMovement by type + businessId frequently.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_stock_movement_type_business"
  ON "StockMovement" ("type", "businessId");

-- CreditNote lookup by customer + date range (return rate signal)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_credit_note_customer_created"
  ON "CreditNote" ("customerId", "createdAt");

-- Payment lookup for frequency calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_customer_created"
  ON "Payment" ("customerId", "createdAt");
