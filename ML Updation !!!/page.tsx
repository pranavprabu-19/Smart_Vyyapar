/**
 * src/app/dashboard/ml-insights/page.tsx
 * =======================================
 * Dedicated ML Insights page with recharts visualisations.
 * Route: /dashboard/ml-insights
 *
 * Server component that fetches data, then passes to a client component
 * for interactive charts.
 */

import { Suspense } from "react";
import { auth } from "@/lib/auth";          // adjust to your auth setup
import { redirect } from "next/navigation";
import { getStockInsights, getCustomerRiskScores } from "@/actions/stock-prediction";
import { MLInsightsDashboard } from "@/components/dashboard/MLInsightsDashboard";

export const metadata = { title: "ML Insights — SmartVyapar" };

export default async function MLInsightsPage({
  searchParams,
}: {
  searchParams: { filter?: string; tab?: string; action?: string };
}) {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/login");

  const [insights, risk] = await Promise.all([
    getStockInsights(session.user.businessId),
    getCustomerRiskScores(session.user.businessId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          ML Insights Control Center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered inventory health and customer risk analysis ·{" "}
          {insights.seasonality.month_label} {new Date().getFullYear()} ·{" "}
          Phase 1 enriched signals
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Loading insights…
          </div>
        }
      >
        <MLInsightsDashboard
          insights={insights}
          risk={risk}
          defaultFilter={searchParams.filter}
          defaultTab={searchParams.tab}
        />
      </Suspense>
    </div>
  );
}
