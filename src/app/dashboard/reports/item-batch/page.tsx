"use client";

import { useState } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useInvoice } from "@/lib/invoice-context";
import { useProducts } from "@/lib/product-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Search, History, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ItemBatchReportPage() {
    const { invoices } = useInvoice();
    const { products } = useProducts();
    const [selectedProductSku, setSelectedProductSku] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState("");

    // 1. Build Movement History per Product
    const movementHistory = products.flatMap(product => {
        // Find all invoices containing this product
        const productSales = invoices.flatMap(inv => {
            const item = inv.items.find(i => i.id === product.sku);
            if (!item) return [];
            return [{
                date: inv.date,
                ref: inv.invoiceNo,
                type: "OUT" as const,
                batch: `BATCH-${inv.date.replace(/-/g, '').slice(2, 6)}`, // Simulated Batch based on Date
                qty: item.quantity,
                partner: inv.customer.name,
                productName: product.name,
                sku: product.sku
            }];
        });

        // Add "Opening Stock" Entry (Synthetic)
        // We assume Current Stock + Sold = Opening Balance for this demo
        const totalSold = productSales.reduce((sum, m) => sum + m.qty, 0);
        const openingStock = product.stock + totalSold;

        const openingEntry = {
            date: "2024-01-01", // Fiscal Year Start
            ref: "OP-BAL",
            type: "IN" as const,
            batch: "OPENING-BATCH",
            qty: openingStock,
            partner: "Opening Balance",
            productName: product.name,
            sku: product.sku
        };

        return [openingEntry, ...productSales];
    });

    // 2. Filter & Sort
    const filteredMovements = movementHistory
        .filter(m =>
            (selectedProductSku === "ALL" || m.sku === selectedProductSku) &&
            (m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.ref.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <PageShell
            title="Item Batch & Serial Report"
            description="Track inventory movement by batch numbers and serials."
        >
            <div className="space-y-6">

                {/* Filters */}
                <Card>
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by Item, Batch, or Reference..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={selectedProductSku} onValueChange={setSelectedProductSku} >
                            <SelectTrigger className="w-full md:w-[250px]">
                                <SelectValue placeholder="Filter by Product" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Products</SelectItem>
                                {products.map(p => (
                                    <SelectItem key={p.sku} value={p.sku}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Movement Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Batch Movement Register</CardTitle>
                            <CardDescription>Showing {filteredMovements.length} transactions.</CardDescription>
                        </div>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Batch / Serial</TableHead>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Transaction Ref</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Party / Notes</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMovements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <History className="h-8 w-8 opacity-20" />
                                                <p>No movements found matching filters.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMovements.map((move, idx) => (
                                            <TableRow key={`${move.sku}-${idx}`}>
                                                <TableCell className="whitespace-nowrap">{move.date}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{move.batch}</TableCell>
                                                <TableCell className="font-medium">{move.productName}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {move.ref}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={move.type === 'IN' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200'}>
                                                        {move.type === 'IN' ? 'Stock In' : 'Sales Out'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{move.partner}</TableCell>
                                                <TableCell className={`text-right font-bold ${move.type === 'IN' ? 'text-blue-600' : 'text-orange-600'}`}>
                                                    {move.type === 'IN' ? '+' : '-'}{move.qty}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageShell>
    );
}
