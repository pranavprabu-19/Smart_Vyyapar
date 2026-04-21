import { cookies } from "next/headers";
import { predictStockoutAction } from "@/actions/stock-prediction";
import { predictCustomerRiskAction } from "@/actions/customer-prediction";
import { AIHealthChart } from "@/components/dashboard/ml/ai-health-chart";
import { InventoryPredictionsTable } from "@/components/dashboard/ml/inventory-predictions-table";
import { LiquidationWidget } from "@/components/dashboard/ml/liquidation-widget";
import { AutomationRunner } from "@/components/dashboard/ml/automation-runner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, AlertTriangle, RefreshCw, BarChart2, TrendingDown, Users, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MLInsightsPage() {
    const cookieStore = await cookies();
    const company = decodeURIComponent(cookieStore.get("selectedCompany")?.value || "Sai Associates");

    const mlResponse = await predictStockoutAction(company);
    const riskResponse = await predictCustomerRiskAction(company);
    const predictions = mlResponse.predictions || [];
    const riskSummary = riskResponse.summary || {
        tier_a: 0,
        tier_b: 0,
        tier_c: 0,
        auto_limit_reduction_candidates: 0,
    };

    const criticalCount = predictions.filter(p => p.status === "CRITICAL").length;
    const lowCount = predictions.filter(p => p.status === "LOW").length;
    const safeCount = predictions.filter(p => p.status === "SAFE").length;
    const liquidationCandidates = predictions.filter((p) => p.isLiquidationCandidate).length;
    const liquidationHoldingCost = predictions
        .filter((p) => p.isLiquidationCandidate)
        .reduce((sum, p) => sum + (p.holdingCostEstimate || 0), 0);

    const totalReorders = predictions.reduce((acc, curr) => acc + (curr.reorderQuantity || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <BrainCircuit className="h-8 w-8 text-indigo-500" />
                        ML Intelligence Hub
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Predictive inventory insights powered by Fast API Machine Learning.
                    </p>
                </div>
                <AutomationRunner companyName={company} />
            </div>

            {/* High-level ML Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Analyzed SKUs</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{predictions.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Processed successfully</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Action</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalCount} <span className="text-lg font-normal text-muted-foreground">items</span></div>
                        <p className="text-xs text-muted-foreground mt-1">Requires immediate reorder</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Queue</CardTitle>
                        <BarChart2 className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lowCount} <span className="text-lg font-normal text-muted-foreground">items</span></div>
                        <p className="text-xs text-muted-foreground mt-1">Approaching minimum threshold</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Est. Reorder Volume</CardTitle>
                        <RefreshCw className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalReorders.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">units</span></div>
                        <p className="text-xs text-muted-foreground mt-1">Suggested by Economic Order Qty</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-fuchsia-500/10 to-rose-500/10 border-fuchsia-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Liquidation Engine</CardTitle>
                        <TrendingDown className="h-4 w-4 text-fuchsia-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-fuchsia-700 dark:text-fuchsia-300">{liquidationCandidates} <span className="text-lg font-normal text-muted-foreground">SKUs</span></div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Rs {liquidationHoldingCost.toLocaleString()} holding cost risk
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Risk Tier A/B/C</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">
                            {riskSummary.tier_a} / {riskSummary.tier_b} / {riskSummary.tier_c}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Customer risk model pipeline</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Auto Credit Actions</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{riskSummary.auto_limit_reduction_candidates}</div>
                        <p className="text-xs text-muted-foreground mt-1">Eligible for limit reduction</p>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2 border-dashed border-primary/40 bg-primary/5">
                    <CardContent className="pt-4">
                        <p className="text-sm">
                            ML pipelines connected: <strong>Inventory stockout</strong> + <strong>Customer risk scoring</strong>.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Data source: live company data from invoices, products, balances, and credit notes.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-1">
                    <AIHealthChart predictions={predictions} />
                </div>
                <div className="md:col-span-2">
                    <InventoryPredictionsTable predictions={predictions} />
                </div>
            </div>
            <LiquidationWidget predictions={predictions} />
        </div>
    );
}
