"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, X, ArrowUpDown, QrCode, Printer, MessageSquare, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { generateInvoicePDF, InvoiceData, InvoiceItem, calculateInvoiceTotals, generateUPIString } from "@/lib/invoice-utils";
import { useCompany } from "@/lib/company-context";
import { useInvoice } from "@/lib/invoice-context";
import { useAuth } from "@/lib/auth-context";
import { getProductsAction } from "@/actions/inventory";
import { getCustomersAction } from "@/actions/customer";
import { UPIQRDisplay } from "@/components/ui/upi-qr-display";
import { COMPANY_DETAILS } from "@/lib/invoice-utils";
import { getCompanyByNameAction } from "@/actions/company";
import { getGodownsAction } from "@/actions/godown";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["All", "General", "Food", "Water", "Beverage"];

interface POSModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}

const POS_MODAL = ({ isOpen, onClose, children, title }: POSModalProps) => {
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

export default function POSPage() {
    const { currentCompany } = useCompany();
    const { addInvoice } = useInvoice(); // Note: This context function might need update or we call action directly?
    // Using context is better for optimistic updates, but context calls 'createInvoiceAction'.
    // We should ensure 'addInvoice' in context passes all fields or we update context too.
    // For now we assume addInvoice accepts InvoiceData structure.

    const { user } = useAuth();

    // Data State
    const [dbProducts, setDbProducts] = useState<any[]>([]);
    const [dbCustomers, setDbCustomers] = useState<any[]>([]);
    const [godowns, setGodowns] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [companyDetails, setCompanyDetails] = useState<any>(null);

    // UI State
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [selectedGodownId, setSelectedGodownId] = useState<string>("");

    // Cart State
    const [cart, setCart] = useState<{ id: string, qty: number }[]>([]);

    // Invoice State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CHEQUE" | "CREDIT">("CASH");
    const [generatedInvoice, setGeneratedInvoice] = useState<InvoiceData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGST, setIsGST] = useState(true);
    const [paperSize, setPaperSize] = useState<'a4' | 'a5' | 'thermal-2' | 'thermal-3'>('a5');
    const [isSharing, setIsSharing] = useState(false);

    // Advanced Billing Features
    const [discount, setDiscount] = useState<{ type: 'PERCENTAGE' | 'FIXED', value: number } | null>(null);
    const [partialPayment, setPartialPayment] = useState<number | null>(null);

    const activeCustomer = dbCustomers.find(c => c.id === selectedCustomerId);

    // Fetch Data
    const loadData = async () => {
        setIsLoadingData(true);
        try {
            const [prodRes, custRes, compRes, godownsRes] = await Promise.all([
                getProductsAction(currentCompany),
                getCustomersAction(currentCompany),
                getCompanyByNameAction(currentCompany),
                getGodownsAction()
            ]);

            if (godownsRes.success && godownsRes.godowns) {
                setGodowns(godownsRes.godowns);
                // Set default godown
                if (godownsRes.godowns.length > 0 && !selectedGodownId) {
                    setSelectedGodownId(godownsRes.godowns[0].id);
                }
            }

            if (prodRes.success && prodRes.products) {
                setDbProducts(prodRes.products);
            }
            if (custRes.success && custRes.customers) {
                setDbCustomers(custRes.customers);
            }
            if (compRes.success && compRes.company) {
                setCompanyDetails({
                    address: `${compRes.company.address}, ${compRes.company.city} - ${compRes.company.pincode}`,
                    phone: compRes.company.phone,
                    email: compRes.company.email,
                    gstin: compRes.company.gstin,
                    bank: compRes.company.bankName,
                    ac: compRes.company.accountNo,
                    ifsc: compRes.company.ifscCode,
                    branch: compRes.company.branch,
                    upiId: "9677150152@okbizaxis",
                    logoUrl: compRes.company.logoUrl,
                    signatureUrl: compRes.company.signatureUrl
                });
            } else {
                setCompanyDetails(null);
            }
        } catch (e) {
            console.error("Failed to load POS data", e);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentCompany]);

    // Helper to get stock for current godown
    const getProductStock = (product: any) => {
        if (!selectedGodownId) return product.stock; // Fallback to total
        const stockRecord = product.stocks?.find((s: any) => s.godownId === selectedGodownId);
        return stockRecord ? stockRecord.quantity : 0;
    };

    // Filter Logic
    const filteredProducts = dbProducts
        .filter(p => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchCat = activeCategory === "All" || p.category === activeCategory;
            return matchSearch && matchCat;
        })
        .sort((a, b) => {
            return sortOrder === "asc" ? a.price - b.price : b.price - a.price;
        });

    const toggleSort = () => setSortOrder(prev => prev === "asc" ? "desc" : "asc");

    // Cart Handlers
    const addToCart = (productId: string) => {
        const product = dbProducts.find(p => p.id === productId);
        if (!product) return;

        const availableStock = getProductStock(product);
        const currentQtyInCart = cart.find(i => i.id === productId)?.qty || 0;

        if (availableStock <= currentQtyInCart) {
            toast.warning(`Only ${availableStock} items available in selected godown.`);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === productId);
            if (existing) {
                return prev.map(item => item.id === productId ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { id: productId, qty: 1 }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        const product = dbProducts.find(p => p.id === id);
        const availableStock = getProductStock(product);

        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.qty + delta);
                if (newQty > availableStock) {
                    toast.warning("Cannot exceed available stock");
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(item => item.qty > 0));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    // Calculations
    const cartCalculation = cart.reduce((acc, item) => {
        const product = dbProducts.find(p => p.id === item.id);
        const price = product?.price || 0;
        const qty = item.qty;
        const gstRate = product?.gstRate || 18.0;

        const taxable = price * qty;
        const gstAmount = (taxable * gstRate) / 100;

        return {
            subTotal: acc.subTotal + taxable,
            gstTotal: acc.gstTotal + gstAmount,
            total: acc.total + taxable + gstAmount
        };
    }, { subTotal: 0, gstTotal: 0, total: 0 });

    // Apply discount
    let discountAmount = 0;
    if (discount) {
        if (discount.type === 'PERCENTAGE') {
            discountAmount = (cartCalculation.subTotal * discount.value) / 100;
        } else {
            discountAmount = discount.value;
        }
    }

    const displaySubTotal = cartCalculation.subTotal;
    const displayGST = isGST ? cartCalculation.gstTotal : 0;
    const displayTotalBeforeDiscount = isGST ? cartCalculation.total : cartCalculation.subTotal;
    const displayTotal = Math.max(0, displayTotalBeforeDiscount - discountAmount);

    // Partial payment calculation
    const paidAmount = partialPayment || displayTotal;
    const remainingAmount = paymentMode === 'CREDIT' ? displayTotal : Math.max(0, displayTotal - (partialPayment || 0));

    const handleCheckout = (mode: "CASH" | "UPI" | "CHEQUE" | "CREDIT") => {
        setPaymentMode(mode);
        if (mode === "CREDIT") {
            setPartialPayment(null); // Clear partial payment for credit sales
        }
        setShowInvoiceModal(true);
    };

    const generateInvoice = async () => {
        setIsGenerating(true);
        if (!selectedCustomerId) {
            alert("Please select a customer");
            setIsGenerating(false);
            return;
        }

        const invoiceItems: InvoiceItem[] = cart.map((item) => {
            const product = dbProducts.find(p => p.id === item.id);
            return {
                id: item.id,
                description: product?.name || "Unknown Item",
                hsn: product?.hsn || "8517",
                quantity: item.qty,
                unit: product?.unit || "Nos",
                mrp: product?.price || 0,
                price: product?.price || 0,
                gstRate: product?.gstRate || 18.0
            };
        });

        try {
            const invoiceData: InvoiceData = {
                companyName: currentCompany,
                companyProfile: companyDetails,
                invoiceNo: `POS-${Date.now().toString().slice(-6)}`,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString(),
                placeOfSupply: "33-Tamil Nadu",
                customer: {
                    name: activeCustomer.name,
                    address: activeCustomer.address,
                    state: activeCustomer.state || "Tamil Nadu",
                    gstin: activeCustomer.gstin || "",
                    phone: activeCustomer.phone || undefined,
                    email: activeCustomer.email || undefined,
                    lat: activeCustomer.lat || undefined,
                    lng: activeCustomer.lng || undefined
                },
                items: invoiceItems,
                paymentMode: paymentMode,
                godownId: selectedGodownId,
                discount: discount ? {
                    type: discount.type,
                    value: discount.value,
                    description: discount.type === 'PERCENTAGE' ? `${discount.value}% discount` : `₹${discount.value} discount`
                } : undefined,
                partialPayment: partialPayment && partialPayment < displayTotal ? {
                    amount: partialPayment,
                    remaining: remainingAmount
                } : undefined,
                settings: {
                    isGST: isGST,
                    paperSize: paperSize,
                    logo: companyDetails?.logoUrl,
                    signature: companyDetails?.signatureUrl
                }
            };

            setGeneratedInvoice(invoiceData);
            // Assuming addInvoice handles godownId passed in invoiceData
            addInvoice(invoiceData, { name: user?.name || "POS User", role: user?.role || "EMPLOYEE" }, "POS Terminal 01");

            const doc = await generateInvoicePDF(invoiceData);
            const blob = doc.output('blob');
            setPreviewUrl(URL.createObjectURL(blob));
            loadData(); // Reload stock
        } catch (error) {
            console.error("Error generating invoice:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShareWhatsApp = async () => {
        if (!generatedInvoice || isSharing) return;
        setIsSharing(true);
        // ... (Same Share Logic as before)
        try {
            const doc = await generateInvoicePDF(generatedInvoice);
            const { totalAmount } = calculateInvoiceTotals(generatedInvoice.items);
            const amtStr = totalAmount.toFixed(2);
            let message = `*Invoice Generated* 📄\n\n` +
                `Store: *${currentCompany}*\n` +
                `Invoice No: *${generatedInvoice.invoiceNo}*\n` +
                `Amount: *₹${amtStr}*\n\n`;

            if (companyDetails?.upiId) {
                const upiLink = generateUPIString(
                    companyDetails.upiId,
                    currentCompany,
                    Number(amtStr),
                    generatedInvoice.invoiceNo
                );
                message += `*Payment Options:*\n` +
                    `UPI ID: ${companyDetails.upiId}\n` +
                    `Click to Pay:\n${upiLink}\n\n`;
            }
            message += `Thank you for your business!`;

            const blob = doc.output('blob');
            const file = new File([blob], `Invoice-${generatedInvoice.invoiceNo}.pdf`, { type: 'application/pdf' });
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

            if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: `Invoice ${generatedInvoice.invoiceNo}`,
                        text: message,
                        files: [file]
                    });
                } catch (shareError: any) {
                    if (shareError.name === 'AbortError') return;
                    throw shareError;
                }
                return;
            }

            doc.save(`${generatedInvoice.invoiceNo}.pdf`);
            try { await navigator.clipboard.writeText(message); toast.success("Copied to clipboard!"); } catch (err) { }
            toast.info("PDF Downloaded.");
            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        } catch (e) {
            console.error(e);
            toast.error("Share failed");
        } finally {
            setIsSharing(false);
        }
    };

    const handlePrint = () => {
        if (!previewUrl) return;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = previewUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
    };

    const handleNewOrder = () => {
        setCart([]);
        setGeneratedInvoice(null);
        setPreviewUrl(null);
        setShowInvoiceModal(false);
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-4">
            {/* Left Side: Products */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    {/* Godown Selector */}
                    <div className="w-[200px]">
                        <Select value={selectedGodownId} onValueChange={setSelectedGodownId}>
                            <SelectTrigger>
                                <Warehouse className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Select Godown" />
                            </SelectTrigger>
                            <SelectContent>
                                {godowns.map(g => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                    {CATEGORIES.map(cat => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>

                <div className="overflow-y-auto flex-1 pr-2">
                    {/* Stock Warning if no godown */}
                    {!selectedGodownId && (
                        <div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-2 text-sm text-center">
                            Please select a Godown to view accurate stock.
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => {
                            const stock = getProductStock(product);
                            const lowStock = stock < (product.minStock || 10);
                            return (
                                <Card
                                    key={product.id}
                                    className={`cursor-pointer hover:border-primary transition-colors ${stock === 0 ? 'opacity-50' : ''}`}
                                    onClick={() => addToCart(product.id)}
                                >
                                    <CardContent className="p-4 flex flex-col items-center gap-2">
                                        <div className="text-4xl h-16 w-16 flex items-center justify-center bg-gray-50 rounded-full relative">
                                            {product.image}
                                            <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold ${stock === 0 ? 'bg-red-100 text-red-600' :
                                                lowStock ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                                                }`}>
                                                {stock}
                                            </div>
                                        </div>
                                        <div className="text-center w-full">
                                            <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                                            <div className="flex justify-between items-center mt-1 w-full text-sm">
                                                <span className="font-bold">₹{product.price}</span>
                                                {product.gstRate && product.gstRate !== 18 && (
                                                    <span className="text-[10px] bg-muted px-1 rounded">+{product.gstRate}%</span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Side: Cart (Unchanged Structure, just logic for stock check implemented above) */}
            <div className="w-[400px] flex flex-col border-l pl-4">
                <div className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> Current Order
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <ShoppingCart className="h-12 w-12 mb-2" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map(item => {
                            const product = dbProducts.find(p => p.id === item.id);
                            if (!product) return null;
                            const taxLabel = isGST && product.gstRate ? `+${product.gstRate}%` : '';
                            return (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{product.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            ₹{product.price} x {item.qty} {taxLabel}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateQty(item.id, -1); }}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1); }}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="border-t pt-4 mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tax Mode</span>
                        <div className="flex items-center space-x-2">
                            <Switch id="gst-mode" checked={isGST} onCheckedChange={setIsGST} disabled={!!generatedInvoice} />
                            <label htmlFor="gst-mode" className="text-sm cursor-pointer">
                                {isGST ? "GST" : "Est"}
                            </label>
                        </div>
                    </div>

                    <div className="space-y-1 text-sm bg-muted/20 p-3 rounded-lg">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal (Taxable)</span>
                            <span>₹{displaySubTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Total GST</span>
                            <span>₹{displayGST.toFixed(2)}</span>
                        </div>
                        {discount && discountAmount > 0 && (
                            <div className="flex justify-between text-orange-600">
                                <span>Discount {discount.type === 'PERCENTAGE' ? `(${discount.value}%)` : ''}</span>
                                <span>-₹{discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                            <span>Grand Total</span>
                            <span>₹{displayTotal.toFixed(2)}</span>
                        </div>
                        {partialPayment && partialPayment < displayTotal && (
                            <div className="flex justify-between text-sm pt-1 border-t">
                                <span className="text-muted-foreground">Paid</span>
                                <span className="text-green-600 font-semibold">₹{paidAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {partialPayment && partialPayment < displayTotal && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Remaining</span>
                                <span className="text-red-600 font-semibold">₹{remainingAmount.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Discount Controls */}
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                placeholder="Discount %"
                                className="flex-1"
                                value={discount?.type === 'PERCENTAGE' ? discount.value : ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val >= 0 && val <= 100) {
                                        setDiscount({ type: 'PERCENTAGE', value: val });
                                    } else if (e.target.value === '') {
                                        setDiscount(null);
                                    }
                                }}
                            />
                            <Input
                                type="number"
                                placeholder="Discount ₹"
                                className="flex-1"
                                value={discount?.type === 'FIXED' ? discount.value : ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val >= 0) {
                                        setDiscount({ type: 'FIXED', value: val });
                                    } else if (e.target.value === '') {
                                        setDiscount(null);
                                    }
                                }}
                            />
                            {discount && (
                                <Button variant="ghost" size="icon" onClick={() => setDiscount(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {paymentMode !== 'CREDIT' && (
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Partial payment amount"
                                    value={partialPayment || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val >= 0) {
                                            setPartialPayment(val);
                                        } else if (e.target.value === '') {
                                            setPartialPayment(null);
                                        }
                                    }}
                                />
                                {partialPayment && (
                                    <Button variant="ghost" size="icon" onClick={() => setPartialPayment(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="lg"
                            disabled={cart.length === 0 || !selectedCustomerId}
                            onClick={() => handleCheckout("CASH")}
                        >
                            <Banknote className="mr-2 h-4 w-4" /> Cash
                        </Button>
                        <Button
                            className="w-full"
                            size="lg"
                            variant="outline"
                            disabled={cart.length === 0 || !selectedCustomerId}
                            onClick={() => handleCheckout("UPI")}
                        >
                            <QrCode className="mr-2 h-4 w-4" /> UPI
                        </Button>
                        <Button
                            className="w-full"
                            size="lg"
                            variant="secondary"
                            disabled={cart.length === 0 || !selectedCustomerId}
                            onClick={() => handleCheckout("CHEQUE")}
                        >
                            <CreditCard className="mr-2 h-4 w-4" /> Cheque
                        </Button>
                        <Button
                            className="w-full"
                            size="lg"
                            variant="outline"
                            disabled={cart.length === 0 || !selectedCustomerId}
                            onClick={() => handleCheckout("CREDIT")}
                        >
                            <CreditCard className="mr-2 h-4 w-4" /> Credit
                        </Button>
                    </div>
                </div>
            </div>

            <POS_MODAL isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title={`Generate Invoice - ${paymentMode} Payment`}>
                {/* Reusing existing modal content mostly, just ensure it uses state correct */}
                <div className="grid grid-cols-2 gap-6 h-full">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Customer</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border text-sm"
                                value={selectedCustomerId}
                                onChange={(e) => {
                                    setSelectedCustomerId(e.target.value);
                                    setGeneratedInvoice(null);
                                    setPreviewUrl(null);
                                }}
                                disabled={!!generatedInvoice}
                            >
                                <option value="" disabled>Select Customer...</option>
                                {dbCustomers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.address})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Print Size</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border text-sm"
                                value={paperSize}
                                onChange={(e) => setPaperSize(e.target.value as any)}
                                disabled={!!generatedInvoice}
                            >
                                <option value="a4">A4 (Standard)</option>
                                <option value="a5">A5 (Half Page)</option>
                                <option value="thermal-3">Thermal 3" (80mm)</option>
                                <option value="thermal-2">Thermal 2" (58mm)</option>
                            </select>
                        </div>

                        <div className="border rounded-lg p-4 bg-muted/20">
                            <h4 className="font-semibold mb-2">Order Summary</h4>
                            <div className="space-y-1 text-sm">
                                {cart.map(item => {
                                    const product = dbProducts.find(pr => pr.id === item.id);
                                    const itemTax = isGST ? (((product?.price || 0) * (product?.gstRate || 18)) / 100) * item.qty : 0;
                                    const itemTotal = ((product?.price || 0) * item.qty) + itemTax;

                                    return (
                                        <div key={item.id} className="flex justify-between">
                                            <span>{product?.name} x {item.qty}</span>
                                            <span>₹{itemTotal.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                                <div className="border-t pt-2 mt-2 font-bold flex justify-between">
                                    <span>Total Payable</span>
                                    <span>₹{displayTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {generatedInvoice ? (
                            <div className="space-y-3 pt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <Button className="w-full gap-2" variant="outline" onClick={handleShareWhatsApp} disabled={isSharing}>
                                        {isSharing ? <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <MessageSquare className="h-4 w-4 text-green-600" />}
                                        WhatsApp
                                    </Button>
                                    <Button className="w-full gap-2" variant="outline" onClick={handlePrint}>
                                        <Printer className="h-4 w-4" /> Print
                                    </Button>
                                </div>
                                <Button className="w-full gap-2" size="lg" onClick={handleNewOrder}>
                                    <Plus className="h-4 w-4" /> New Order
                                </Button>
                            </div>
                        ) : (
                            <Button
                                className="w-full gap-2"
                                size="lg"
                                onClick={generateInvoice}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    paymentMode === "UPI" ? <QrCode className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />
                                )}
                                {isGenerating ? "Generating..." : "Generate Invoice"}
                            </Button>
                        )}
                    </div>

                    <div className="border rounded-lg bg-gray-100 flex flex-col items-center justify-center overflow-hidden relative h-full">
                        {previewUrl ? (
                            paymentMode === "UPI" && generatedInvoice ? (
                                <div className="flex flex-col items-center text-center p-6 space-y-4 bg-white w-full h-full justify-center overflow-auto">
                                    <h3 className="text-xl font-bold text-green-600">Invoice Generated!</h3>
                                    <UPIQRDisplay
                                        upiId={COMPANY_DETAILS[currentCompany]?.upiId || "9677150152@okbizaxis"}
                                        payeeName={currentCompany}
                                        amount={displayTotal.toFixed(2)}
                                        invoiceNo={generatedInvoice.invoiceNo}
                                    />
                                    <div className="pt-4 text-sm text-muted-foreground">
                                        Scan QR to Pay
                                    </div>
                                </div>
                            ) : (
                                <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full" title="Invoice Preview" />
                            )
                        ) : (
                            <div className="text-muted-foreground flex flex-col items-center">
                                <Banknote className="h-12 w-12 mb-2 opacity-20" />
                                <p>Invoice Preview will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </POS_MODAL>
        </div >
    );
}
