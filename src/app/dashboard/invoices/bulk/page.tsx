"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useCompany } from "@/lib/company-context";
import { useAuth } from "@/lib/auth-context";
import { createBulkInvoicesAction } from "@/actions/invoice";
import { toast } from "sonner";
import { Check, Loader2, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { InvoiceData } from "@/lib/invoice-utils";

export default function BulkInvoicePage() {
    const { currentCompany } = useCompany();
    const { user } = useAuth();

    // Data Stats
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Selection State
    const [selectedProductSku, setSelectedProductSku] = useState<string>("");
    const [defaultQty, setDefaultQty] = useState<number>(2);

    // Customer Selection & Custom Qty
    // Map of customerId -> quantity (if selected)
    const [selectedCustomers, setSelectedCustomers] = useState<Record<string, number>>({});

    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Load Customers
                const { getCustomersAction } = await import("@/actions/customer");
                const custRes = await getCustomersAction(currentCompany);
                if (custRes.success && custRes.customers) {
                    setCustomers(custRes.customers);
                }

                // Load Products
                const { getProductsAction } = await import("@/actions/inventory");
                const prodRes = await getProductsAction(currentCompany);
                if (prodRes.success && prodRes.products) {
                    setProducts(prodRes.products);
                    // Default select first product
                    if (prodRes.products.length > 0) setSelectedProductSku(prodRes.products[0].sku);
                }
            } catch (e) {
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentCompany]);


    const toggleCustomer = (custId: string) => {
        setSelectedCustomers(prev => {
            const next = { ...prev };
            if (next[custId]) {
                delete next[custId];
            } else {
                next[custId] = defaultQty; // Init with default
            }
            return next;
        });
    };

    const updateCustomerQty = (custId: string, qty: number) => {
        if (qty < 1) return;
        setSelectedCustomers(prev => ({
            ...prev,
            [custId]: qty
        }));
    };

    const selectAll = () => {
        const next: Record<string, number> = {};
        filteredCustomers.forEach(c => {
            next[c.id] = defaultQty;
        });
        setSelectedCustomers(next);
    };

    const clearSelection = () => {
        setSelectedCustomers({});
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGenerate = async () => {
        const product = products.find(p => p.sku === selectedProductSku);
        if (!product) {
            toast.error("Please select a product");
            return;
        }

        const customerIds = Object.keys(selectedCustomers);
        if (customerIds.length === 0) {
            toast.error("Please select at least one customer");
            return;
        }

        if (!confirm(`Generate ${customerIds.length} invoices for ${product.name}?`)) return;

        setIsSubmitting(true);

        try {
            const invoicesToCreate: InvoiceData[] = customerIds.map(custId => {
                const customer = customers.find(c => c.id === custId);
                const qty = selectedCustomers[custId];
                const price = product.price;

                return {
                    companyName: currentCompany,
                    invoiceNo: `INV-${Date.now()}-${custId.slice(-4)}`, // Unique-ish
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString(),
                    placeOfSupply: "33-Tamil Nadu",
                    paymentMode: "CREDIT", // Bulk usually Credit/Pending
                    employeeId: user?.id,
                    customer: {
                        name: customer.name,
                        address: customer.address,
                        state: customer.state,
                        gstin: customer.gstin || "",
                        phone: customer.phone,
                        email: customer.email
                    },
                    items: [{
                        id: product.sku,
                        description: product.name,
                        hsn: "2201",
                        quantity: qty,
                        unit: "PCS",
                        mrp: price,
                        price: price, // Taxable
                        gstRate: 18, // Fixed or from product?
                        costPrice: product.costPrice
                    }]
                };
            });

            // Uniqueness strategy: Timestamp + Index + Random
            const baseTime = Date.now();
            invoicesToCreate.forEach((inv, idx) => {
                inv.invoiceNo = `INV-${baseTime}-${idx}-${Math.floor(Math.random() * 999)}`;
            });

            const result = await createBulkInvoicesAction(invoicesToCreate);

            if (result.success) {
                toast.success(`Success! Created ${result.count} invoices.`);
                setSelectedCustomers({});
            } else {
                toast.error("Failed: " + result.error);
            }
        } catch (e) {
            toast.error("Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <PageShell title="Bulk Invoice Generation" description="Generate daily supply invoices for multiple customers at once.">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)]">

                {/* Left Controller */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>Select Product & Defaults</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Product</label>
                            <select
                                className="w-full p-2 border rounded-md"
                                value={selectedProductSku}
                                onChange={(e) => setSelectedProductSku(e.target.value)}
                            >
                                {products.map(p => (
                                    <option key={p.sku} value={p.sku}>{p.name} (₹{p.price})</option>
                                ))}
                            </select>
                            <div className="text-xs text-muted-foreground">
                                Stock: {products.find(p => p.sku === selectedProductSku)?.stock || 0}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Default Quantity</label>
                            <Input
                                type="number"
                                min={1}
                                value={defaultQty}
                                onChange={(e) => setDefaultQty(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Applied when you select a customer. You can override it per customer.
                            </p>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex justify-between text-sm mb-2">
                                <span>Selected:</span>
                                <span className="font-bold">{Object.keys(selectedCustomers).length}</span>
                            </div>
                            <Button className="w-full" disabled={Object.keys(selectedCustomers).length === 0 || isSubmitting} onClick={handleGenerate}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate All"}
                            </Button>
                        </div>

                        <Link href="/dashboard/invoices">
                            <Button variant="ghost" className="w-full mt-2 gap-2"><ArrowLeft className="h-3 w-3" /> Back to List</Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Right List */}
                <Card className="md:col-span-3 flex flex-col overflow-hidden">
                    <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Select Customers</CardTitle>
                            <CardDescription>Select customers to bill</CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search customers..."
                                    className="pl-8 w-[200px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                            <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 w-[50px]"></th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3 w-[150px] text-center">Quantity</th>
                                    <th className="p-3 w-[100px] text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading && <tr><td colSpan={4} className="p-8 text-center">Loading...</td></tr>}
                                {!loading && filteredCustomers.map(cust => {
                                    const isSelected = !!selectedCustomers[cust.id];
                                    const qty = selectedCustomers[cust.id] || defaultQty;
                                    const product = products.find(p => p.sku === selectedProductSku);
                                    const price = product ? product.price : 0;

                                    return (
                                        <tr key={cust.id} className={isSelected ? "bg-primary/5" : "hover:bg-muted/5"}>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300"
                                                    checked={isSelected}
                                                    onChange={() => toggleCustomer(cust.id)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium">{cust.name}</div>
                                                <div className="text-xs text-muted-foreground">{cust.address}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {isSelected ? (
                                                    <Input
                                                        type="number"
                                                        className="h-8 w-20 mx-auto text-center"
                                                        value={qty}
                                                        onChange={(e) => updateCustomerQty(cust.id, parseInt(e.target.value) || 0)}
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                {isSelected ? `₹${(price * qty).toFixed(0)}` : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </PageShell>
    );
}
