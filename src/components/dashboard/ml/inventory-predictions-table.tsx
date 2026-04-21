"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StockPrediction } from "@/actions/stock-prediction";

interface InventoryPredictionsTableProps {
    predictions: StockPrediction[];
}

export function InventoryPredictionsTable({ predictions }: InventoryPredictionsTableProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "CRITICAL":
                return <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 shadow-none border-red-500/20">Critical</Badge>;
            case "LOW":
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 shadow-none border-amber-500/20">Low</Badge>;
            case "SAFE":
            default:
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-emerald-500/20">Healthy</Badge>;
        }
    };

    return (
        <Card className="shadow-md border-primary/10">
            <CardHeader className="bg-gradient-to-r from-card to-muted/20 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                    Predicted Reorder Queue
                </CardTitle>
                <CardDescription>
                    Economic Order Quantities computed by the ML Engine
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px]">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-md z-10">
                            <TableRow>
                                <TableHead className="w-[100px]">SKU</TableHead>
                                <TableHead>Product Name</TableHead>
                                <TableHead className="text-right">Current Stock</TableHead>
                                <TableHead className="text-right">Days Left</TableHead>
                                <TableHead>AI Status</TableHead>
                                    <TableHead>Liquidation</TableHead>
                                <TableHead className="text-right font-semibold text-primary">ML Reorder Qty</TableHead>
                                <TableHead className="text-right">Est. Stockout</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {predictions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No inventory data available for ML processing.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                predictions.map((pred) => (
                                    <TableRow key={pred.sku} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-xs font-mono text-muted-foreground">{pred.sku}</TableCell>
                                        <TableCell className="font-semibold">{pred.productName}</TableCell>
                                        <TableCell className="text-right">{pred.currentStock}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {pred.daysLeft > 90 ? '90+' : Math.max(0, Math.floor(pred.daysLeft))} days
                                        </TableCell>
                                        <TableCell>{getStatusBadge(pred.status)}</TableCell>
                                        <TableCell>
                                            {pred.isLiquidationCandidate ? (
                                                <Badge variant="outline" className="bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30">
                                                    Candidate
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-primary">
                                            {pred.reorderQuantity > 0 ? pred.reorderQuantity : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {pred.predictedStockoutDate ? new Date(pred.predictedStockoutDate).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
