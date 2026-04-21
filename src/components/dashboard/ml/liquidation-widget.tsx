"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StockPrediction } from "@/actions/stock-prediction";

interface LiquidationWidgetProps {
    predictions: StockPrediction[];
}

export function LiquidationWidget({ predictions }: LiquidationWidgetProps) {
    const candidates = predictions.filter((p) => p.isLiquidationCandidate);
    const estimatedHoldingCost = candidates.reduce((sum, item) => sum + (item.holdingCostEstimate || 0), 0);

    return (
        <Card className="shadow-md border-fuchsia-500/20">
            <CardHeader className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border-b">
                <CardTitle>Liquidation Opportunities</CardTitle>
                <CardDescription>
                    SKUs with {">"} 90 days of stock and low sales velocity
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30">
                        {candidates.length} candidates
                    </Badge>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30">
                        Holding Cost: Rs {estimatedHoldingCost.toLocaleString()}
                    </Badge>
                </div>

                {candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No liquidation candidates right now.</p>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-auto pr-1">
                        {candidates.map((item) => (
                            <div
                                key={item.sku}
                                className="rounded-md border border-border/60 p-3 bg-muted/20"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">{item.productName}</p>
                                    <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {item.daysLeft > 90 ? "90+" : Math.floor(item.daysLeft)} days left • Avg sales {item.avgDailySales}/day
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Estimated monthly holding cost: Rs {(item.holdingCostEstimate || 0).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
