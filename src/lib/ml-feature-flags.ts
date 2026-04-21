/**
 * Customer credit automation is opt-in: set `ML_ENABLE_CREDIT_AUTOMATION=true` after
 * validating invoice/credit/credit-note data and ML risk output. Schedule
 * `GET` or `POST /api/ml/apply-risk-actions` (Vercel Cron uses GET; use `CRON_SECRET` or `ML_CRON_SECRET`).
 */
export const mlFeatureFlags = {
    enableCreditAutomation: process.env.ML_ENABLE_CREDIT_AUTOMATION === "true",
    enableLiquidationWriteback: process.env.ML_ENABLE_LIQUIDATION_WRITEBACK !== "false",
};
