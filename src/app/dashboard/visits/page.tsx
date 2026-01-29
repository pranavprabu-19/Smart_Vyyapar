"use client";

import { toast } from "sonner";

import { useState, useRef, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Camera, ShoppingCart, Clock, CheckCircle, Navigation } from "lucide-react";
import { useCompany } from "@/lib/company-context";

import { REAL_CUSTOMERS, REAL_PRODUCTS } from "@/lib/real-data";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-utils";
import { Plus, Minus, X, Save, FileText, Check, CreditCard, Banknote } from "lucide-react";
import { useInvoice } from "@/lib/invoice-context";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { updateInvoicePaymentAction } from "@/actions/invoice";

// Generate Beat Plan from Real Data (Moved to component to avoid hydration error)
const INITIAL_SHOPS = REAL_CUSTOMERS.slice(0, 5).map((cust, idx) => ({
    id: cust.id,
    name: cust.name,
    address: cust.location,
    status: idx === 0 ? 'PENDING' : 'PENDING', // All pending initially
    lastVisit: "2024-01-15" // Fixed date for server render, updated on client if needed
}));

const PDF_MODAL = ({ isOpen, onClose, children, title }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
};

export default function VisitsPage() {
    const { currentCompany } = useCompany();
    const { addInvoice, invoices, updateInvoiceStatus } = useInvoice();
    const { user } = useAuth();

    // Helper to find today's invoices for a shop
    const getShopInvoices = (shopName: string) => {
        const today = new Date().toISOString().split('T')[0];
        return invoices.filter(inv =>
            inv.customer.name === shopName &&
            inv.date === today
        );
    };

    const [shops, setShops] = useState<any[]>([]);
    const [activeVisit, setActiveVisit] = useState<any | null>(null);
    const [dbProducts, setDbProducts] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            // Load Customers (Shops)
            const { getCustomersAction } = await import("@/actions/customer");
            const shopRes = await getCustomersAction(currentCompany);
            if (shopRes.success && shopRes.customers) {
                const mappedShops = shopRes.customers.map((cust, idx) => ({
                    id: cust.id,
                    name: cust.name,
                    address: cust.address,
                    status: 'PENDING',
                    lastVisit: new Date(Date.now() - 86400000 * (idx + 1)).toLocaleDateString()
                }));
                setShops(mappedShops);
            }

            // Load Products
            const { getProductsAction } = await import("@/actions/inventory");
            const prodRes = await getProductsAction(currentCompany);
            if (prodRes.success && prodRes.products) {
                setDbProducts(prodRes.products);
            }
        };

        loadData();
    }, [currentCompany]);
    const [visitTimer, setVisitTimer] = useState("00:00");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Order Taking State
    const [isOrderMode, setIsOrderMode] = useState(false);
    const [cart, setCart] = useState<Record<string, number>>({});

    // Invoice State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setActiveVisit((prev: any) => ({
                ...prev,
                photos: (prev.photos || 0) + 1
            }));
            alert("Stock Photo Captured & Saved!");
        }
    };

    const startVisit = (shop: any) => {
        setActiveVisit({
            ...shop,
            startTime: new Date(),
            photos: 0,
            orderValue: 0
        });
        setCart({});
        setIsOrderMode(false);
        let seconds = 0;
        setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            setVisitTimer(`${mins}:${secs}`);
        }, 1000);
    };

    const updateCart = (sku: string, delta: number) => {
        setCart(prev => {
            const current = prev[sku] || 0;
            const next = Math.max(0, current + delta);
            const newCart = { ...prev, [sku]: next };
            if (next === 0) delete newCart[sku];
            return newCart;
        });
    };

    const getCartTotal = () => {
        return Object.entries(cart).reduce((total, [sku, qty]) => {
            const product = dbProducts.find(p => p.sku === sku);
            return total + (product ? product.price * qty : 0);
        }, 0);
    };

    const saveOrder = () => {
        const total = getCartTotal();
        setActiveVisit((prev: any) => ({ ...prev, orderValue: total }));
        setIsOrderMode(false);
    };

    const handleGenerateInvoice = async () => {
        if (!activeVisit) return;

        const invoiceItems = Object.entries(cart).map(([sku, qty]) => {
            const product = dbProducts.find(p => p.sku === sku);
            const price = product?.price || 0;
            const cost = product?.costPrice || (price * 0.7);
            return {
                id: sku,
                description: product?.name || "Unknown Item",
                hsn: "2201",
                quantity: qty,
                unit: "PCS",
                mrp: price,
                price: price,
                gstRate: 18,
                costPrice: cost
            };
        });

        const invoiceData: InvoiceData = {
            companyName: currentCompany,
            invoiceNo: `VISIT-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            placeOfSupply: "33-Tamil Nadu",
            paymentMode: "CASH", // Default for Field Visits
            customer: {
                name: activeVisit.name,
                address: activeVisit.address,
                state: "33-Tamil Nadu",
                gstin: "33AAAAA0000A1Z5"
            },
            items: invoiceItems
        };

        // NOTIFY / STORE
        addInvoice(invoiceData, { name: user?.name || "Field Officer", role: user?.role || "FIELD_WORKER" }, activeVisit.address || "Field Location");

        const doc = await generateInvoicePDF(invoiceData);
        doc.autoPrint();
        const blob = doc.output('blob');
        setPreviewUrl(URL.createObjectURL(blob));

        // Clear cart after invoice generation to prevent double billing? 
        // Or keep it to allow 'Order' tracking?
        // Let's keep it but mark as done in UI if we had such state.
    };

    const endVisit = async () => {
        if (Object.keys(cart).length > 0) {
            const confirmSave = confirm("You have items in your cart. Do you want to generate an invoice before finishing?");
            if (confirmSave) {
                await handleGenerateInvoice();
            }
        }

        if (confirm("End visit and submit report?")) {
            // Update shop status in local state
            setShops(prev => prev.map(s =>
                s.id === activeVisit.id ? { ...s, status: 'COMPLETED' } : s
            ));

            toast.success("Visit Report Submitted!", {
                description: "Start moving to next shop."
            });

            setActiveVisit(null);
            setCart({});
            setIsOrderMode(false);
        }
    };

    const handleViewInvoice = async (inv: any) => {
        const doc = await generateInvoicePDF(inv);
        const blob = doc.output('blob');
        setPreviewUrl(URL.createObjectURL(blob));
        setPreviewUrl(URL.createObjectURL(blob));
    };

    const handleMarkAsPaid = (inv: any) => {
        setSelectedInvoice(inv);
        setPaymentModalOpen(true);
    };

    const confirmPayment = async (mode: string) => {
        if (!selectedInvoice) return;

        const result = await updateInvoicePaymentAction(selectedInvoice.invoiceNo, "PAID", mode);

        if (result.success) {
            toast.success(`Payment Received via ${mode}`, {
                description: `Invoice ${selectedInvoice.invoiceNo} marked as PAID.`
            });
            updateInvoiceStatus(selectedInvoice.invoiceNo, "PAID");
        } else {
            toast.error("Failed to update payment status");
        }
        setPaymentModalOpen(false);
        setSelectedInvoice(null);
    };

    return (
        <PageShell title="Shop Visits" description="Field officer daily beat plan and reporting.">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Active Visit Card */}
                <div className="md:col-span-2">
                    {activeVisit ? (
                        <Card className="border-primary bg-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <div className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Active Visit</div>
                                    <CardTitle className="text-2xl">{activeVisit.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> {activeVisit.address}
                                    </CardDescription>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-mono font-bold text-primary">{visitTimer}</div>
                                    <div className="text-xs text-muted-foreground">Duration</div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                {isOrderMode ? (
                                    <div className="space-y-4 bg-background p-4 rounded-lg border shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-semibold text-lg">New Order</h3>
                                            <Button variant="ghost" size="sm" onClick={() => setIsOrderMode(false)}><X className="h-4 w-4" /></Button>
                                        </div>

                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                            {dbProducts.map(product => (
                                                <div key={product.sku} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-sm">{product.name}</div>
                                                        <div className="text-xs text-muted-foreground">₹{product.price}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {cart[product.sku] ? (
                                                            <>
                                                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCart(product.sku, -1)}><Minus className="h-3 w-3" /></Button>
                                                                <span className="w-4 text-center text-sm font-bold">{cart[product.sku]}</span>
                                                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCart(product.sku, 1)}><Plus className="h-3 w-3" /></Button>
                                                            </>
                                                        ) : (
                                                            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => updateCart(product.sku, 1)}>Add</Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-muted-foreground">Total Items: {Object.keys(cart).length}</div>
                                                <div className="text-lg font-bold">₹{getCartTotal().toFixed(2)}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" onClick={handleGenerateInvoice} disabled={Object.keys(cart).length === 0} className="gap-2">
                                                    <FileText className="h-4 w-4" /> Invoice
                                                </Button>
                                                <Button onClick={saveOrder} disabled={Object.keys(cart).length === 0} className="gap-2">
                                                    <Save className="h-4 w-4" /> Save
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                            />
                                            <Button className="h-24 flex flex-col gap-2" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                                <Camera className="h-8 w-8" />
                                                <span>Capture Stock</span>
                                                {activeVisit.photos > 0 && <span className="text-xs font-bold text-green-600">{activeVisit.photos} Captured</span>}
                                            </Button>
                                            <Button className="h-24 flex flex-col gap-2 relative overflow-hidden" variant="outline" onClick={() => setIsOrderMode(true)}>
                                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                                    <ShoppingCart className="h-16 w-16" />
                                                </div>
                                                <ShoppingCart className="h-8 w-8" />
                                                <span>Take Order</span>
                                                {activeVisit.orderValue > 0 && <span className="text-xs font-bold text-green-600">Total: ₹{activeVisit.orderValue}</span>}
                                            </Button>
                                        </div>

                                        {/* Generated Invoices List for Active Visit */}
                                        {getShopInvoices(activeVisit.name).length > 0 && (
                                            <div className="mt-4 p-3 bg-background rounded-lg border">
                                                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Generated Invoices</h4>
                                                <div className="space-y-2">
                                                    {getShopInvoices(activeVisit.name).map(inv => (
                                                        <div key={inv.invoiceNo} className="flex flex-col gap-1 p-2 bg-muted/20 rounded hover:bg-muted/40 transition-colors">
                                                            <div className="flex justify-between items-center text-sm cursor-pointer" onClick={() => handleViewInvoice(inv)}>
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="h-4 w-4 text-primary" />
                                                                    <span className="font-medium underline decoration-dashed underline-offset-2">{inv.invoiceNo}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold">₹{inv.totalAmount || inv.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)}</span>
                                                                    <Badge variant={inv.status === 'PAID' ? 'default' : 'destructive'} className="text-[10px] h-5 px-1.5 ml-1">
                                                                        {inv.status || 'PENDING'}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            {(inv.status === 'PENDING' || !inv.status) && (
                                                                <div className="flex justify-end pt-1 border-t border-dashed border-primary/10 mt-1">
                                                                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 bg-background" onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(inv); }}>
                                                                        Mark as Paid
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter>
                                {!isOrderMode && (
                                    <Button className="w-full" size="lg" onClick={endVisit}>
                                        Check Out & Finish
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ) : (
                        <Card className="bg-muted/20 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                                <Navigation className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">Ready to start?</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                                    Select a shop from your beat plan below to check in.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Beat Plan List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Today's Beat Plan</CardTitle>
                        <CardDescription>{new Date().toLocaleDateString()} • {currentCompany}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {shops.map((shop) => {
                                const shopInvoices = getShopInvoices(shop.name);
                                return (
                                    <div key={shop.id} className="flex flex-col gap-2 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${shop.status === 'COMPLETED' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-secondary'}`}>
                                                    {shop.status === 'COMPLETED' ? <CheckCircle className="h-5 w-5" /> : <span className="font-bold text-sm">{shop.name.charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{shop.name}</div>
                                                    <div className="text-sm text-muted-foreground">{shop.address}</div>
                                                </div>
                                            </div>

                                            {shop.status === 'PENDING' && !activeVisit && (
                                                <Button size="sm" onClick={() => startVisit(shop)}>Check In</Button>
                                            )}
                                            {shop.status === 'COMPLETED' && (
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">Completed</span>
                                            )}
                                        </div>

                                        {/* Display Invoices if any */}
                                        {shopInvoices.length > 0 && (
                                            <div className="mt-2 pl-14">
                                                <div className="flex flex-wrap gap-2">
                                                    {shopInvoices.map(inv => (
                                                        <div key={inv.invoiceNo} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded flex items-center gap-1 border border-primary/20 hover:bg-primary/20 transition-colors">
                                                            <div onClick={() => handleViewInvoice(inv)} className="flex items-center gap-1 cursor-pointer">
                                                                <FileText className="h-3 w-3" />
                                                                {inv.invoiceNo} - ₹{inv.totalAmount || inv.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)}
                                                            </div>
                                                            {/* Status Indicator Dot */}
                                                            <div className={`w-2 h-2 rounded-full ${inv.status === 'PAID' ? 'bg-green-500' : 'bg-red-500'}`} title={inv.status || 'PENDING'} />

                                                            {(inv.status === 'PENDING' || !inv.status) && (
                                                                <button onClick={() => handleMarkAsPaid(inv)} className="ml-1 hover:text-green-600 font-bold px-1" title="Mark Paid">
                                                                    ₹
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <PDF_MODAL isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)} title="Invoice Preview">
                <div className="flex items-center justify-center h-[70vh] bg-gray-100 rounded-lg overflow-hidden">
                    {previewUrl && (
                        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full" title="Invoice Preview" />
                    )}
                </div>
            </PDF_MODAL>

            {/* Payment Mode Modal */}
            <PDF_MODAL isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Payment">
                <div className="p-4 space-y-4">
                    <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Select payment mode for invoice</p>
                        <p className="font-bold text-lg">{selectedInvoice?.invoiceNo}</p>
                        <p className="text-xl font-bold text-primary">₹{selectedInvoice?.totalAmount}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <Button variant="outline" className="h-20 flex flex-col gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary" onClick={() => confirmPayment('CASH')}>
                            <Banknote className="h-6 w-6" />
                            <span>Cash</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary" onClick={() => confirmPayment('UPI')}>
                            <span className="font-bold text-lg">UPI</span>
                            <span className="text-xs">GPay / PhonePe</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary" onClick={() => confirmPayment('CHEQUE')}>
                            <CreditCard className="h-6 w-6" />
                            <span>Cheque</span>
                        </Button>
                    </div>
                </div>
            </PDF_MODAL>
        </PageShell>
    );
}
