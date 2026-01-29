"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, X, Package } from "lucide-react";
import { transferStockAction, getGodownsAction } from "@/actions/godown";
import { toast } from "sonner";

interface StockTransferProps {
    product: {
        id: string;
        sku: string;
        name: string;
        stocks?: Array<{ godownId: string; quantity: number; godown: { name: string } }>;
    };
    onSuccess?: () => void;
    onClose: () => void;
}

export function StockTransfer({ product, onSuccess, onClose }: StockTransferProps) {
    const [godowns, setGodowns] = useState<any[]>([]);
    const [fromGodownId, setFromGodownId] = useState<string>("");
    const [toGodownId, setToGodownId] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadGodowns = async () => {
            const res = await getGodownsAction();
            if (res.success && res.godowns) {
                setGodowns(res.godowns);
            }
        };
        loadGodowns();
    }, []);

    const getStockInGodown = (godownId: string) => {
        if (!product.stocks) return 0;
        const stock = product.stocks.find(s => s.godownId === godownId);
        return stock?.quantity || 0;
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!fromGodownId || !toGodownId) {
            toast.error("Please select both source and destination godowns");
            return;
        }

        if (fromGodownId === toGodownId) {
            toast.error("Source and destination godowns cannot be the same");
            return;
        }

        const qty = parseInt(quantity);
        if (!qty || qty <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        const availableStock = getStockInGodown(fromGodownId);
        if (qty > availableStock) {
            toast.error(`Insufficient stock. Only ${availableStock} units available in selected godown.`);
            return;
        }

        setLoading(true);
        const res = await transferStockAction({
            productId: product.id,
            fromGodownId,
            toGodownId,
            quantity: qty,
            reason: reason || undefined
        });

        if (res.success) {
            toast.success(`Successfully transferred ${qty} units`);
            setFromGodownId("");
            setToGodownId("");
            setQuantity("");
            setReason("");
            onSuccess?.();
            onClose();
        } else {
            toast.error(res.error || "Failed to transfer stock");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Transfer Stock
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {product.name} ({product.sku})
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="from-godown">From Godown *</Label>
                            <Select value={fromGodownId} onValueChange={setFromGodownId} required>
                                <SelectTrigger id="from-godown">
                                    <SelectValue placeholder="Select source godown" />
                                </SelectTrigger>
                                <SelectContent>
                                    {godowns.map(godown => {
                                        const stock = getStockInGodown(godown.id);
                                        return (
                                            <SelectItem key={godown.id} value={godown.id}>
                                                {godown.name} {stock > 0 && `(${stock} available)`}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            {fromGodownId && (
                                <p className="text-xs text-muted-foreground">
                                    Available: {getStockInGodown(fromGodownId)} units
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="to-godown">To Godown *</Label>
                            <Select value={toGodownId} onValueChange={setToGodownId} required>
                                <SelectTrigger id="to-godown">
                                    <SelectValue placeholder="Select destination godown" />
                                </SelectTrigger>
                                <SelectContent>
                                    {godowns
                                        .filter(g => g.id !== fromGodownId)
                                        .map(godown => {
                                            const stock = getStockInGodown(godown.id);
                                            return (
                                                <SelectItem key={godown.id} value={godown.id}>
                                                    {godown.name} {stock > 0 && `(${stock} units)`}
                                                </SelectItem>
                                            );
                                        })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                max={fromGodownId ? getStockInGodown(fromGodownId) : undefined}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="Enter quantity"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason (Optional)</Label>
                            <Input
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Restocking, Transfer request"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" disabled={loading}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                {loading ? "Transferring..." : "Transfer Stock"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
