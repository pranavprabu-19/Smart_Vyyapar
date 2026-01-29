"use client";

import { useCompany } from "@/lib/company-context";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Send, CheckCircle, Plus, RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProductsAction, updateStockAction } from "@/actions/inventory";

export default function RestockPage() {
    const { currentCompany } = useCompany();
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Manual Restock State
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [restockQty, setRestockQty] = useState("50");

    const loadRestockItems = async () => {
        setLoading(true);
        // Reuse prediction logic
        const { predictStockoutAction } = await import("@/actions/stock-prediction");
        const res = await predictStockoutAction(currentCompany);

        if (res.success && res.predictions) {
            // Filter strictly for items needing attention (Low or Critical)
            const urgent = res.predictions.filter((p: any) => p.status === 'LOW' || p.status === 'CRITICAL');
            setLowStockItems(urgent);
        }
        setLoading(false);
    };

    const loadAllProducts = async () => {
        const res = await getProductsAction(currentCompany);
        if (res.success && res.products) {
            setAllProducts(res.products);
        }
    };

    useEffect(() => {
        loadRestockItems();
        loadAllProducts();
    }, [currentCompany]);

    const handleRestock = async (sku: string, qty: number) => {
        const res = await updateStockAction(sku, qty, 'ADD');
        if (res.success) {
            toast.success(`Stock updated! Added ${qty} units.`);
            loadRestockItems(); // Refresh local list
            loadAllProducts();
            router.refresh(); // Refresh server components (Balance Sheet)
        } else {
            toast.error("Failed to update stock");
        }
    };

    const handleManualSubmit = async () => {
        if (!selectedProduct) return;
        const product = allProducts.find(p => p.id === selectedProduct);
        if (!product) return;

        await handleRestock(product.sku, parseInt(restockQty));
        setIsManualOpen(false);
        // Reset defaults
        setSelectedProduct("");
        setRestockQty("50");
    };

    return (
        <PageShell
            title="Restock Recommendations"
            description="AI-driven purchase orders for items likely to run out soon."
            action={
                <>
                    <Button className="gap-2" onClick={() => setIsManualOpen(true)}>
                        <Plus className="w-4 h-4" /> Manual Restock
                    </Button>
                    <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Stock Manually</DialogTitle>
                                <DialogDescription>
                                    Select an item and enter the quantity to add to inventory.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Select Item</Label>
                                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Search or select item..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="overflow-y-auto max-h-[200px]">
                                                {allProducts.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} (Cur: {p.stock})
                                                    </SelectItem>
                                                ))}
                                            </div>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Quantity to Add</Label>
                                    <Input
                                        type="number"
                                        value={restockQty}
                                        onChange={(e) => setRestockQty(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleManualSubmit}>Update Inventory</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            }
        >
            <div className="grid gap-4 mt-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground p-8">
                        <RefreshCw className="animate-spin h-4 w-4" /> Analyzing sales trends...
                    </div>
                ) : lowStockItems.length === 0 ? (
                    <div className="text-center p-10 border rounded-lg bg-muted/10">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold">All Systems Go!</h3>
                        <p className="text-muted-foreground">Your inventory is healthy. No immediate restocking needed.</p>
                        <Button variant="outline" className="mt-4" onClick={() => setIsManualOpen(true)}>
                            Add Stock Manually
                        </Button>
                    </div>
                ) : (
                    lowStockItems.map((item) => (
                        <Card key={item.sku} className={`border-l-4 ${item.status === 'CRITICAL' ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg">{item.productName}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.status === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Current Stock: <span className="font-mono font-medium text-foreground">{item.currentStock}</span>
                                        <span className="mx-2">•</span>
                                        Avg Sales: {item.avgDailySales}/day
                                        <span className="mx-2">•</span>
                                        Est. Stockout: {item.predictedStockoutDate || "Unknown"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right mr-4 hidden md:block">
                                        <div className="text-xs text-muted-foreground">Recommended Order</div>
                                        <div className="font-bold text-xl">{item.reorderQuantity} Units</div>
                                    </div>
                                    <Button onClick={() => handleRestock(item.sku, item.reorderQuantity)}>
                                        <Send className="w-4 h-4 mr-2" />
                                        Auto Restock
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </PageShell>
    );
}
