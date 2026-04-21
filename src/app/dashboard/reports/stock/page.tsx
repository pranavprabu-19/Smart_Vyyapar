"use client";

import { useState, useEffect, useMemo } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, TrendingUp, AlertCircle, Warehouse } from "lucide-react";
import { getProductsAction } from "@/actions/inventory";
import { getGodownsAction, getGodownStatsAction } from "@/actions/godown";
import { useCompany } from "@/lib/company-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/dashboard/export-button";

export default function StockReportsPage() {
    const { currentCompany } = useCompany();
    const [products, setProducts] = useState<any[]>([]);
    const [godowns, setGodowns] = useState<any[]>([]);
    const [godownStats, setGodownStats] = useState<any[]>([]);
    const [movementSources, setMovementSources] = useState<string[]>([
        "INVOICE_DEDUCTION",
        "STOCK_TRANSFER",
        "MANUAL_STOCK_UPDATE",
    ]);
    const [loading, setLoading] = useState(true);
    const [selectedGodown, setSelectedGodown] = useState<string>("all");
    const [reportType, setReportType] = useState<'summary' | 'godown' | 'category' | 'low-stock'>('summary');

    const loadData = async () => {
        setLoading(true);
        try {
            const [productsRes, godownsRes, statsRes] = await Promise.all([
                getProductsAction(currentCompany),
                getGodownsAction(),
                getGodownStatsAction()
            ]);

            if (productsRes.success && productsRes.products) {
                setProducts(productsRes.products);
            }
            if (godownsRes.success && godownsRes.godowns) {
                setGodowns(godownsRes.godowns);
            }
            if (statsRes.success && statsRes.stats) {
                setGodownStats(statsRes.stats);
            }
            const semanticSources = [
                ...(productsRes as any).stockSemantics?.movementSources || [],
                ...(statsRes as any).stockSemantics?.movementSources || [],
            ];
            if (semanticSources.length > 0) {
                setMovementSources(Array.from(new Set(semanticSources)));
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentCompany]);

    // Calculate totals
    const totalStockValue = products.reduce((sum, p) => {
        const cost = p.costPrice || (p.price * 0.7);
        return sum + (p.stock * cost);
    }, 0);

    const totalStockQuantity = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockItems = products.filter(p => p.stock <= p.minStock);
    const criticalItems = products.filter(p => p.stock <= (p.minStock * 0.5));

    // Filter by godown if selected
    const filteredProducts = selectedGodown === "all"
        ? products
        : products.filter(p => p.stocks?.some((s: any) => s.godownId === selectedGodown));

    // Group by category
    const categoryGroups = filteredProducts.reduce((acc: any, p) => {
        const cat = p.category || "General";
        if (!acc[cat]) {
            acc[cat] = { products: [], totalQty: 0, totalValue: 0 };
        }
        acc[cat].products.push(p);
        acc[cat].totalQty += p.stock;
        acc[cat].totalValue += (p.stock * (p.costPrice || p.price * 0.7));
        return acc;
    }, {});

    const exportRows = useMemo(() => {
        if (reportType === "godown") {
            return godownStats.map((g) => ({
                godown: g.name,
                location: g.location || "",
                totalItems: g.totalItems,
                totalQuantity: g.totalQuantity,
                totalValue: Number((g.totalValue || 0).toFixed(2)),
                lowStockItems: g.lowStockItems,
            }));
        }
        if (reportType === "category") {
            return Object.entries(categoryGroups).map(([name, group]: any) => ({
                category: name,
                products: group.products.length,
                totalQuantity: group.totalQty,
                totalValue: Number((group.totalValue || 0).toFixed(2)),
            }));
        }
        if (reportType === "low-stock") {
            return lowStockItems.map((p) => ({
                product: p.name,
                sku: p.sku,
                stock: p.stock,
                minStock: p.minStock,
                gap: Math.max(0, (p.minStock || 0) - (p.stock || 0)),
            }));
        }
        return filteredProducts.map((p) => {
            const cost = p.costPrice || p.price * 0.7;
            return {
                product: p.name,
                sku: p.sku,
                stock: p.stock,
                minStock: p.minStock,
                costPrice: Number(cost.toFixed(2)),
                stockValue: Number((p.stock * cost).toFixed(2)),
            };
        });
    }, [reportType, godownStats, categoryGroups, lowStockItems, filteredProducts]);

    return (
        <PageShell
            title="Stock Reports & Analytics"
            description="Comprehensive stock analysis and reports"
            action={
                <div className="flex gap-2">
                    <ExportButton
                        data={exportRows}
                        filename={`stock-report-${reportType}-${new Date().toISOString().split("T")[0]}`}
                        title="Stock Report"
                    />
                </div>
            }
        >
            {/* Report Type Selector */}
            <div className="flex gap-2 mb-6">
                <Button
                    variant={reportType === 'summary' ? 'default' : 'outline'}
                    onClick={() => setReportType('summary')}
                >
                    Summary
                </Button>
                <Button
                    variant={reportType === 'godown' ? 'default' : 'outline'}
                    onClick={() => setReportType('godown')}
                >
                    Godown-wise
                </Button>
                <Button
                    variant={reportType === 'category' ? 'default' : 'outline'}
                    onClick={() => setReportType('category')}
                >
                    Category-wise
                </Button>
                <Button
                    variant={reportType === 'low-stock' ? 'default' : 'outline'}
                    onClick={() => setReportType('low-stock')}
                >
                    Low Stock
                </Button>
            </div>
            <Card className="mb-6 border-blue-400/30 bg-blue-500/10">
                <CardContent className="pt-4 text-sm space-y-2">
                    <p className="font-medium">Movement Scope & Source</p>
                    <p className="text-muted-foreground">
                        Stock movement is currently derived from three live events: invoice deductions, stock transfers, and manual stock updates.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {movementSources.map((source) => (
                            <Badge key={source} variant="secondary">
                                {source.replace(/_/g, " ")}
                            </Badge>
                        ))}
                        <Badge variant="outline">
                            Scope: {selectedGodown === "all" ? "Company-wide totals" : "Selected godown only"}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Report */}
            {reportType === 'summary' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card variant="metric" className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
                                <Package className="h-5 w-5 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{filteredProducts.length}</div>
                                <p className="text-xs text-muted-foreground mt-1">Active products</p>
                            </CardContent>
                        </Card>
                        <Card variant="metric" className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-emerald-600">{totalStockQuantity.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1">Units in stock</p>
                            </CardContent>
                        </Card>
                        <Card variant="metric" className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-purple-600">₹{totalStockValue.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1">At cost price</p>
                            </CardContent>
                        </Card>
                        <Card variant="metric" className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                                <AlertCircle className="h-5 w-5 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600">{lowStockItems.length}</div>
                                <p className="text-xs text-muted-foreground mt-1">{criticalItems.length} critical</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Stock List */}
                    <Card variant="premium">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>
                                    Stock Summary ({selectedGodown === "all" ? "Company-wide" : "Godown-specific"})
                                </CardTitle>
                                <Select value={selectedGodown} onValueChange={setSelectedGodown}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Filter by godown" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Godowns</SelectItem>
                                        {godowns.map(g => (
                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">SKU</TableHead>
                                            <TableHead className="text-right">Stock</TableHead>
                                            <TableHead className="text-right">Min Stock</TableHead>
                                            <TableHead className="text-right">Cost Price</TableHead>
                                            <TableHead className="text-right">Stock Value</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    Loading...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredProducts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No products found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredProducts.map((product) => {
                                                const cost = product.costPrice || (product.price * 0.7);
                                                const stockValue = product.stock * cost;
                                                const isLow = product.stock <= product.minStock;
                                                const isCritical = product.stock <= (product.minStock * 0.5);
                                                
                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-medium">{product.name}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{product.sku}</TableCell>
                                                        <TableCell className="text-right font-bold">{product.stock}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{product.minStock}</TableCell>
                                                        <TableCell className="text-right">₹{cost.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-semibold">₹{stockValue.toLocaleString()}</TableCell>
                                                        <TableCell className="text-center">
                                                            {isCritical ? (
                                                                <Badge variant="destructive">Critical</Badge>
                                                            ) : isLow ? (
                                                                <Badge variant="outline" className="border-yellow-500 text-yellow-700">Low</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="border-green-500 text-green-700">Safe</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Godown-wise Report */}
            {reportType === 'godown' && (
                <div className="space-y-6">
                    <Card variant="premium">
                        <CardHeader>
                            <CardTitle>Godown-wise Stock Distribution</CardTitle>
                            <CardDescription>Stock levels across all godowns</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Godown</TableHead>
                                            <TableHead className="text-right">Location</TableHead>
                                            <TableHead className="text-right">Total Items</TableHead>
                                            <TableHead className="text-right">Total Quantity</TableHead>
                                            <TableHead className="text-right">Stock Value</TableHead>
                                            <TableHead className="text-center">Low Stock Items</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    Loading...
                                                </TableCell>
                                            </TableRow>
                                        ) : godownStats.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No godowns found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            godownStats.map((stat) => {
                                                const godown = godowns.find(g => g.id === stat.id);
                                                return (
                                                    <TableRow key={stat.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <Warehouse className="h-4 w-4 text-muted-foreground" />
                                                                {stat.name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{stat.location || "-"}</TableCell>
                                                        <TableCell className="text-right">{stat.totalItems}</TableCell>
                                                        <TableCell className="text-right font-bold">{stat.totalQuantity.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right font-semibold text-emerald-600">₹{stat.totalValue.toLocaleString()}</TableCell>
                                                        <TableCell className="text-center">
                                                            {stat.lowStockItems > 0 ? (
                                                                <Badge variant="destructive">{stat.lowStockItems}</Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Category-wise Report */}
            {reportType === 'category' && (
                <div className="space-y-6">
                    {Object.entries(categoryGroups).map(([category, data]: [string, any]) => (
                        <Card key={category} variant="premium">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>{category}</CardTitle>
                                    <div className="text-sm text-muted-foreground">
                                        {data.totalQty.toLocaleString()} units • ₹{data.totalValue.toLocaleString()}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-right">SKU</TableHead>
                                                <TableHead className="text-right">Stock</TableHead>
                                                <TableHead className="text-right">Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.products.map((product: any) => {
                                                const cost = product.costPrice || (product.price * 0.7);
                                                const stockValue = product.stock * cost;
                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-medium">{product.name}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{product.sku}</TableCell>
                                                        <TableCell className="text-right font-bold">{product.stock}</TableCell>
                                                        <TableCell className="text-right font-semibold">₹{stockValue.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Low Stock Report */}
            {reportType === 'low-stock' && (
                <div className="space-y-6">
                    <Card variant="premium">
                        <CardHeader>
                            <CardTitle>Low Stock Alert</CardTitle>
                            <CardDescription>
                                {criticalItems.length} critical items, {lowStockItems.length - criticalItems.length} low stock items
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">SKU</TableHead>
                                            <TableHead className="text-right">Current Stock</TableHead>
                                            <TableHead className="text-right">Min Stock</TableHead>
                                            <TableHead className="text-right">Shortage</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lowStockItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No low stock items
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            lowStockItems.map((product) => {
                                                const shortage = Math.max(0, product.minStock - product.stock);
                                                const isCritical = product.stock <= (product.minStock * 0.5);
                                                
                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-medium">{product.name}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{product.sku}</TableCell>
                                                        <TableCell className="text-right font-bold text-red-600">{product.stock}</TableCell>
                                                        <TableCell className="text-right">{product.minStock}</TableCell>
                                                        <TableCell className="text-right font-semibold text-orange-600">{shortage}</TableCell>
                                                        <TableCell className="text-center">
                                                            {isCritical ? (
                                                                <Badge variant="destructive">Critical</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="border-yellow-500 text-yellow-700">Low</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </PageShell>
    );
}
