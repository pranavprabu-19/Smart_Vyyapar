"use client";

import { useCompany } from "@/lib/company-context";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, X, ArrowUpDown, Minus, RefreshCw, Package, TrendingUp, AlertCircle, Clock, Warehouse, ArrowRightLeft, FileScan } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { createProductAction, updateStockAction, getProductsAction } from "@/actions/inventory";
import { getGodownsAction } from "@/actions/godown";
import { StockTransfer } from "@/components/inventory/stock-transfer";
import { StockAdjuster } from "@/components/inventory/stock-adjuster";
import { OcrScanner } from "@/components/inventory/ocr-scanner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function InventoryPage() {
    const { currentCompany } = useCompany();
    const [products, setProducts] = useState<any[]>([]);
    const [godowns, setGodowns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isOcrOpen, setIsOcrOpen] = useState(false);
    const [transferProduct, setTransferProduct] = useState<any>(null);
    const [bulkAdjustProduct, setBulkAdjustProduct] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'godown' | 'all'>('godown'); // 'godown' shows selected godown, 'all' shows all godowns

    // Filter State
    const [selectedGodownId, setSelectedGodownId] = useState<string>("");

    // Form State
    const [newItem, setNewItem] = useState<{
        name: string;
        sku: string;
        price: number;
        costPrice: number;
        stock: number;
        godownId?: string;
    }>({
        name: "",
        sku: "",
        price: 0,
        costPrice: 0,
        stock: 0
    });

    // Load Data
    const loadData = async () => {
        setLoading(true);
        try {
            // Load Godowns
            const godownRes = await getGodownsAction();
            if (godownRes.success && godownRes.godowns) {
                setGodowns(godownRes.godowns);
                // Default to first godown if not set
                if (!selectedGodownId && godownRes.godowns.length > 0) {
                    setSelectedGodownId(godownRes.godowns[0].id);
                }
            }

            // Load Products with godown stock information
            const productsRes = await getProductsAction(currentCompany);
            
            // Load ML Predictions to overlay Analytics onto Products
            const { predictStockoutAction } = await import("@/actions/stock-prediction");
            const mlRes = await predictStockoutAction(currentCompany);

            if (productsRes.success && productsRes.products) {
                let finalProducts = productsRes.products;
                
                if (mlRes.success && mlRes.predictions) {
                    finalProducts = finalProducts.map(p => {
                        const pred = mlRes.predictions!.find(ml => ml.sku === p.sku);
                        if (pred) {
                            return { ...p, avgDailySales: pred.avgDailySales, status: pred.status, predictedStockoutDate: pred.predictedStockoutDate };
                        }
                        return p;
                    });
                }
                
                setProducts(finalProducts);
            } else {
                setProducts([]);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [currentCompany]);

    // Helper to get stock for selected godown
    const getProductStock = (item: any) => {
        // item from predictStockoutAction might have 'stock' (total) or be a raw product
        // We need to check if 'stocks' relation is available.
        // If predictStockoutAction doesn't include 'stocks', we rely on 'currentStock' which is usually total.
        // Wait, predictStockoutAction might only return Product fields + aggregations.
        // We should verify if predictStockoutAction returns 'stocks' relation.
        // Assuming it does (since we updated getProductsAction, but prediction might use its own query).

        // If selectedGodownId is set, filtering by that.
        if (selectedGodownId && item.stocks) {
            const stockRec = item.stocks.find((s: any) => s.godownId === selectedGodownId);
            return stockRec ? stockRec.quantity : 0;
        }
        return item.currentStock || item.stock || 0; // Fallback to total
    };

    // Item Templates
    const ITEM_TEMPLATES = [
        { label: "Select Standard Item...", value: "" },
        { label: "Bisleri Water 250ml - ₹6", sku: "BIS-250ML", price: 6 },
        { label: "Bisleri Water 500ml - ₹10", sku: "BIS-500ML", price: 10 },
        { label: "Bisleri Water 1L - ₹20", sku: "BIS-1L", price: 20 },
        { label: "Bisleri Water 2L - ₹30", sku: "BIS-2L", price: 30 },
        { label: "Bisleri Water 5L Jar - ₹65", sku: "BIS-5L", price: 65 },
        { label: "Bisleri Water 10L Jar - ₹108", sku: "BIS-10L", price: 108 },
        { label: "Bisleri Water 20L Jar - ₹95", sku: "BIS-20L", price: 95 },
        { label: "Bisleri Club Soda 750ml - ₹20", sku: "BIS-SODA-750", price: 20 },
        { label: "Bisleri Limonata 600ml - ₹40", sku: "BIS-LIMONATA-600", price: 40 },
        { label: "Bisleri Spyci Jeera 600ml - ₹40", sku: "BIS-SPYCI-600", price: 40 },
        { label: "Vedica Himalayan 500ml - ₹40", sku: "VEDICA-500", price: 40 },
        { label: "Vedica Himalayan 1L - ₹60", sku: "VEDICA-1L", price: 60 },
        { label: "Custom / Other", value: "custom" }
    ];

    const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = ITEM_TEMPLATES.find(t => t.label === e.target.value);

        if (selected && selected.value !== "custom" && selected.value !== "") {
            setNewItem({
                ...newItem,
                name: selected.label,
                sku: selected.sku || "",
                price: selected.price || 0,
                costPrice: (selected.price || 0) * 0.7
            });
        } else if (selected?.value === "custom") {
            setNewItem({ ...newItem, name: "", sku: "", price: 0, costPrice: 0 });
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.sku || !newItem.name) return;

        const res = await createProductAction({
            sku: newItem.sku!,
            name: newItem.name!,
            price: Number(newItem.price),
            stock: Number(newItem.stock),
            costPrice: Number(newItem.costPrice),
            category: "Beverage",
            companyName: currentCompany,
            godownId: newItem.godownId || selectedGodownId // Use selected or default
        });

        if (res.success) {
            toast.success("Item Added Successfully!");
            setIsAddModalOpen(false);
            setNewItem({ sku: "", name: "", price: 0, costPrice: 0, stock: 0 });
            loadData();
        } else {
            toast.error(res.error || "Failed to add item");
        }
    };

    const handleUpdateStock = async (sku: string, qty: number, type: 'ADD' | 'DEDUCT') => {
        // If DEDUCT, check if enough stock in godown
        if (type === 'DEDUCT') {
            const product = products.find(p => p.sku === sku);
            const current = getProductStock(product);
            if (current < qty) {
                toast.error("Insufficient stock in selected godown");
                return;
            }
        }

        const res = await updateStockAction(sku, qty, type, selectedGodownId);
        if (res.success) {
            toast.success("Stock updated");
            loadData();
        } else {
            toast.error("Failed to update stock");
        }
    };

    // Filter Logic
    const filteredInventory = products.filter(item =>
        (item.productName || item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate Total Value based on view? Or Global?
    // Let's do Global for now or filtered.
    const totalStockValue = filteredInventory.reduce((acc, item) => acc + (getProductStock(item) * (item.price || 0)), 0);

    return (
        <PageShell
            title={`${currentCompany} Inventory`}
            description={`Managing stock for ${currentCompany}`}
            action={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsOcrOpen(true)} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                        <FileScan className="mr-2 h-4 w-4" /> Scan Invoice (OCR)
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/dashboard/inventory/restock'}>
                        Restock Insights
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
            }
        >
            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card variant="metric" className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
                        <Package className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{filteredInventory.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Products in list</p>
                    </CardContent>
                </Card>
                <Card variant="metric" className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">View Value</CardTitle>
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">₹{totalStockValue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Value in selected godown</p>
                    </CardContent>
                </Card>
                {/* ... other stats ... */}
            </div>

            {/* List/Table */}
            <Card variant="premium">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle>Inventory Tracker</CardTitle>
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            {/* View Mode Toggle */}
                            <div className="flex gap-1 border rounded-md p-1">
                                <Button
                                    type="button"
                                    variant={viewMode === 'godown' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setViewMode('godown')}
                                >
                                    <Warehouse className="w-3 h-3 mr-1" />
                                    Godown View
                                </Button>
                                <Button
                                    type="button"
                                    variant={viewMode === 'all' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setViewMode('all')}
                                >
                                    All Godowns
                                </Button>
                            </div>
                            
                            {/* Godown Selector (only show in godown view) */}
                            {viewMode === 'godown' && (
                                <div className="w-full md:w-[200px]">
                                    <Select value={selectedGodownId} onValueChange={setSelectedGodownId}>
                                        <SelectTrigger>
                                            <Warehouse className="w-4 h-4 mr-2" />
                                            <SelectValue placeholder="Select Godown" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {godowns.map(g => (
                                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="relative w-full md:w-[300px]">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-8"
                                    placeholder="Search items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" onClick={loadData}>
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="p-4 font-medium">Item Details</th>
                                    <th className="p-4 font-medium text-right">Stock {viewMode === 'godown' ? '(Selected Godown)' : '(All Godowns)'}</th>
                                    {viewMode === 'all' && <th className="p-4 font-medium text-center">Godown Distribution</th>}
                                    <th className="p-4 font-medium text-right">Avg Daily Sales</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr><td colSpan={viewMode === 'all' ? 6 : 5} className="p-8 text-center text-muted-foreground">Loading inventory...</td></tr>
                                ) : filteredInventory.length === 0 ? (
                                    <tr>
                                        <td colSpan={viewMode === 'all' ? 6 : 5} className="p-8 text-center text-muted-foreground">
                                            No stock items found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInventory.map((item) => {
                                        const currentStock = getProductStock(item);
                                        const totalStock = item.stock || item.currentStock || 0;
                                        const stocksByGodown = item.stocks || [];
                                        
                                        return (
                                            <tr key={item.sku || item.id} className="hover:bg-muted/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium">{item.productName || item.name}</div>
                                                    <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {viewMode === 'godown' ? (
                                                        <StockAdjuster
                                                            currentStock={currentStock}
                                                            onUpdate={async (qty, type) => {
                                                                await handleUpdateStock(item.sku, qty, type);
                                                            }}
                                                            isLowStock={currentStock < 10}
                                                            compact={true}
                                                        />
                                                    ) : (
                                                        <div className="text-right">
                                                            <div className="font-bold">{totalStock}</div>
                                                            <div className="text-xs text-muted-foreground">Total</div>
                                                        </div>
                                                    )}
                                                </td>
                                                {viewMode === 'all' && (
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1 justify-center">
                                                            {stocksByGodown.length > 0 ? (
                                                                stocksByGodown.map((stock: any) => {
                                                                    const godown = godowns.find(g => g.id === stock.godownId);
                                                                    return (
                                                                        <div key={stock.godownId} className="text-xs px-2 py-1 rounded bg-muted">
                                                                            {godown?.name || 'Unknown'}: {stock.quantity}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">No godown data</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="p-4 text-right">
                                                    <div className="text-sm">{item.avgDailySales || 0} / day</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {item.status === 'CRITICAL' && (
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-destructive text-destructive-foreground">Critical</span>
                                                    )}
                                                    {item.status === 'LOW' && (
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-yellow-200 bg-yellow-100 text-yellow-700">Low</span>
                                                    )}
                                                    {(!item.status || item.status === 'SAFE') && (
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-green-200 bg-green-100 text-green-700">Safe</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-1 justify-end">
                                                        {viewMode === 'godown' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                                                onClick={() => setBulkAdjustProduct({ ...item, currentStock })}
                                                                title="Bulk adjust stock quantity"
                                                            >
                                                                <ArrowUpDown className="h-3 w-3 mr-1" />
                                                                Adjust
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs"
                                                            onClick={() => setTransferProduct(item)}
                                                            title="Transfer stock between godowns"
                                                        >
                                                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                                                            Transfer
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Add Item Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-md rounded-lg shadow-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg">Add New Inventory Item</h3>
                            <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            {/* ... Template Select ... */}
                            {/* Godown Select for Initial Stock */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Initial Godown</label>
                                <Select
                                    value={newItem.godownId || selectedGodownId}
                                    onValueChange={(val) => setNewItem({ ...newItem, godownId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Godown" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {godowns.map(g => (
                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Basic Fields */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Name</label>
                                <Input required placeholder="e.g. New Water Bottle" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SKU / Code</label>
                                <Input required placeholder="e.g. ITEM-001" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Selling Price (₹)</label>
                                    <Input required type="number" min="0" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-600">Cost Price (₹)</label>
                                    <Input required type="number" min="0" value={newItem.costPrice} onChange={e => setNewItem({ ...newItem, costPrice: Number(e.target.value) })} placeholder="Buying Rate" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium">Initial Stock</label>
                                    <Input required type="number" min="0" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: Number(e.target.value) })} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">Save Item</Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Transfer Modal */}
            {transferProduct && (
                <StockTransfer
                    product={transferProduct}
                    onSuccess={loadData}
                    onClose={() => setTransferProduct(null)}
                />
            )}

            {/* Bulk Stock Adjustment Modal */}
            {bulkAdjustProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-md rounded-lg shadow-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">Adjust Stock</h3>
                                <p className="text-sm text-muted-foreground">
                                    {bulkAdjustProduct.productName || bulkAdjustProduct.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    SKU: {bulkAdjustProduct.sku} | Godown: {godowns.find(g => g.id === selectedGodownId)?.name || 'Selected'}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setBulkAdjustProduct(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="py-4">
                            <StockAdjuster
                                currentStock={bulkAdjustProduct.currentStock}
                                onUpdate={async (qty, type) => {
                                    await handleUpdateStock(bulkAdjustProduct.sku, qty, type);
                                    // Update the modal's current stock
                                    setBulkAdjustProduct((prev: any) => ({
                                        ...prev,
                                        currentStock: type === 'ADD' 
                                            ? prev.currentStock + qty 
                                            : prev.currentStock - qty
                                    }));
                                }}
                                isLowStock={bulkAdjustProduct.currentStock < 10}
                                compact={false}
                            />
                        </div>

                        <div className="flex gap-2 pt-4 border-t">
                            <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setBulkAdjustProduct(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* OCR Scanner Modal */}
            <OcrScanner
                open={isOcrOpen}
                onOpenChange={setIsOcrOpen}
                onSuccess={loadData}
                currentCompany={currentCompany}
                selectedGodownId={viewMode === 'godown' ? selectedGodownId : undefined}
            />

        </PageShell>
    );
}
