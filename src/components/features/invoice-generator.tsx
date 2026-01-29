"use client";
import { useInvoice } from "@/lib/invoice-context";

import { useState, useEffect } from "react";
import { Download, Plus, Share2, Trash2, Save } from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shareReportOnWhatsApp } from "@/lib/share-utils";
import { CustomerService, Customer } from "@/lib/customer-service";
import { getCompanyDetails } from "@/actions/company";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

// Simple Number to Words for Indian Rupees
const numToWords = (n: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + numToWords(n % 100);
    return numToWords(Math.floor(n / 1000)) + 'Thousand ' + numToWords(n % 1000);
}

interface InvoiceItem {
    id: number;
    description: string;
    hsn: string;
    quantity: number;
    unit: string;
    mrp: number;
    price: number; // Price per unit (Taxable Value)
    gstRate: number;
}

interface CompanyDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
    bank: string;
    ac: string;
    ifsc: string;
    branch: string;
}

export function InvoiceGenerator({ onInvoiceCreated }: { onInvoiceCreated?: () => void }) {
    const { currentCompany } = useCompany();

    const { addInvoice } = useInvoice();

    const [activeCompany, setActiveCompany] = useState<CompanyDetails>({
        name: "Loading...",
        address: "",
        phone: "",
        email: "",
        gstin: "",
        bank: "",
        ac: "",
        ifsc: "",
        branch: ""
    });

    useEffect(() => {
        async function fetchCompany() {
            const details = await getCompanyDetails(currentCompany);
            if (details) {
                setActiveCompany({
                    name: details.name,
                    address: details.address,
                    phone: details.phone || "",
                    email: details.email || "",
                    gstin: details.gstin || "",
                    bank: details.bankName || "",
                    ac: details.accountNo || "",
                    ifsc: details.ifscCode || "",
                    branch: details.branch || ""
                });
            }
        }
        fetchCompany();
    }, [currentCompany]);

    const [invoiceNo, setInvoiceNo] = useState("SAGST-2526-3718");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState("09:15 AM");
    const [placeOfSupply, setPlaceOfSupply] = useState("33-Tamil Nadu");

    // Bill To Details
    const [customerName, setCustomerName] = useState(""); // Default empty
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerState, setCustomerState] = useState("33-Tamil Nadu");
    const [customerGSTIN, setCustomerGSTIN] = useState("");

    // Customer Database State
    const [customers, setCustomers] = useState<Customer[]>([]);

    useEffect(() => {
        // Load customers on mount
        const loadCustomers = async () => {
            const list = await CustomerService.getAll();
            setCustomers(list);
        };
        loadCustomers();
    }, []);

    const handleSaveCustomer = async () => {
        if (!customerName) return;
        try {
            await CustomerService.save({
                name: customerName,
                address: customerAddress,
                state: customerState,
                gstin: customerGSTIN,
                lastInvoiceNo: invoiceNo
            });
            // Refresh list
            const list = await CustomerService.getAll();
            setCustomers(list);
            alert("Customer Saved Successfully!");
        } catch (e) {
            alert("Failed to save customer");
        }
    };

    const handleSelectCustomer = (c: Customer) => {
        setCustomerName(c.name);
        setCustomerAddress(c.address);
        setCustomerState(c.state);
        setCustomerGSTIN(c.gstin || "");
    };

    const [logo, setLogo] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [items, setItems] = useState<InvoiceItem[]>([
        { id: 1, description: "BISLERI WATER 1 LTR X 12 PCS", hsn: "22011010", quantity: 20, unit: "CASE", mrp: 216.00, price: 120.95, gstRate: 5.0 },
    ]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'logo') setLogo(reader.result as string);
                else setSignature(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addItem = () => {
        setItems([
            ...items,
            { id: Date.now(), description: "", hsn: "", quantity: 1, unit: "PCS", mrp: 0, price: 0, gstRate: 5 },
        ]);
    };

    const updateItem = (id: number, field: keyof InvoiceItem, value: any) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const deleteItem = (id: number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const calculateTotals = () => {
        let totalQty = 0;
        let totalAmount = 0;
        let subTotal = 0;

        items.forEach(item => {
            totalQty += item.quantity;
            const taxable = item.quantity * item.price;
            const gstAmount = (taxable * item.gstRate) / 100;
            const finalAmount = taxable + gstAmount;

            subTotal += finalAmount;
            totalAmount += finalAmount;
        });

        return { totalQty, subTotal, totalAmount };
    };

    const generatePDFDocument = async () => {
        const jsPDF = (await import("jspdf")).default;
        const autoTable = (await import("jspdf-autotable")).default;

        const doc = new jsPDF({ format: paperSize, unit: 'mm' });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);
        const centerX = pageWidth / 2;
        const col1X = margin + 2;
        const col2X = centerX + 2;

        // 0. Top Title
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Tax Invoice", centerX, 10, { align: 'center' });

        // --- SECTION 1: HEADER (Logo, Company) ---
        const startY = 15;
        const headerHeight = 35;

        // Main Header Box
        doc.rect(margin, startY, contentWidth, headerHeight);

        // Logo
        if (logo) {
            doc.addImage(logo, 'JPEG', margin + 2, startY + 2, 30, 30);
        } else {
            doc.setFillColor(240, 240, 240);
            doc.rect(margin + 2, startY + 2, 30, 30, 'F');
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("Upload Logo", margin + 5, startY + 18);
            doc.setTextColor(0);
        }

        // Company Details
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(activeCompany.name, centerX, startY + 8, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const addressLines = doc.splitTextToSize(activeCompany.address, contentWidth - 80);
        doc.text(addressLines, centerX, startY + 14, { align: 'center' });

        doc.text(`Phone: ${activeCompany.phone}`, centerX - 30, startY + 24, { align: 'center' });
        doc.text(`Email: ${activeCompany.email}`, centerX + 30, startY + 24, { align: 'center' });
        doc.text(`GSTIN: ${activeCompany.gstin}`, centerX - 30, startY + 30, { align: 'center' });
        doc.text(`State: 33-Tamil Nadu`, centerX + 30, startY + 30, { align: 'center' });

        // --- SECTION 2: CUSTOMER & INVOICE DETAILS ---
        const infoY = startY + headerHeight;
        const infoHeight = 30; // Increased slightly for spacing

        // Container Box (attached to header)
        doc.rect(margin, infoY, contentWidth, infoHeight);

        // Vertical Divider (Split exactly at 50%)
        doc.line(centerX, infoY, centerX, infoY + infoHeight);

        // -- Left Side: Bill To --
        doc.setFont("helvetica", "bold");
        doc.text("Bill To:", col1X, infoY + 5);
        doc.text(customerName, col1X, infoY + 10);

        doc.setFont("helvetica", "normal");
        doc.text(customerAddress, col1X, infoY + 15, { maxWidth: (contentWidth / 2) - 10 });

        const custDetailsY = infoY + 25;
        doc.text(`State: ${customerState}`, col1X, custDetailsY);
        doc.text(`GSTIN: ${customerGSTIN}`, col1X + 50, custDetailsY);

        // -- Right Side: Invoice Details --
        doc.setFont("helvetica", "bold");
        doc.text("Invoice Details:", col2X, infoY + 5);
        doc.setFont("helvetica", "normal");

        const labelX = col2X;
        const valX = col2X + 35;
        const rowGap = 5;

        doc.text("No:", labelX, infoY + 10); doc.text(invoiceNo, valX, infoY + 10);
        doc.text("Date:", labelX, infoY + 10 + rowGap); doc.text(date, valX, infoY + 10 + rowGap);
        doc.text("Time:", labelX, infoY + 10 + (rowGap * 2)); doc.text(time, valX, infoY + 10 + (rowGap * 2));
        doc.text("Place of Supply:", labelX, infoY + 10 + (rowGap * 3)); doc.text(placeOfSupply, valX, infoY + 10 + (rowGap * 3));


        // --- SECTION 3: ITEMS TABLE ---
        const tableY = infoY + infoHeight;

        const tableColumn = [
            { header: 'S.No', dataKey: 'sno' },
            { header: 'Item Name', dataKey: 'desc' },
            { header: 'HSN/SAC', dataKey: 'hsn' },
            { header: 'Qty', dataKey: 'qty' },
            { header: 'Unit', dataKey: 'unit' },
            { header: 'MRP', dataKey: 'mrp' },
            { header: 'Price/Unit', dataKey: 'price' },
            { header: 'GST(%)', dataKey: 'gst' },
            { header: 'Final Rate', dataKey: 'rate' },
            { header: 'Amount', dataKey: 'amount' },
        ];

        const tableRows = items.map((item, index) => {
            const taxable = item.quantity * item.price;
            const gstAmount = (taxable * item.gstRate) / 100;
            const finalRate = item.price + (item.price * item.gstRate / 100);
            const total = taxable + gstAmount;

            return {
                sno: index + 1,
                desc: item.description,
                hsn: item.hsn,
                qty: item.quantity,
                unit: item.unit,
                mrp: item.mrp.toFixed(2),
                price: item.price.toFixed(2),
                gst: `${item.gstRate}%`,
                rate: finalRate.toFixed(2),
                amount: total.toFixed(2),
            };
        });

        // Add empty rows to fill page if needed (Visual preference)
        const minRows = 10;
        if (tableRows.length < minRows) {
            for (let i = tableRows.length; i < minRows; i++) {
                tableRows.push({ sno: '', desc: '', hsn: '', qty: '', unit: '', mrp: '', price: '', gst: '', rate: '', amount: '' } as any);
            }
        }

        const { totalQty, subTotal, totalAmount } = calculateTotals();

        // Footer Row for Table (Total Columns)
        // We will do this manually in the footer section to ensure correct box borders
        // OR use autoTable foot. Let's use foot but ensure styling matches.

        (autoTable as any)(doc, {
            columns: tableColumn,
            body: tableRows,
            startY: tableY,
            theme: 'plain', // Use plain to draw own borders? Or grid. Grid is safer for alignment.
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: {
                fontSize: paperSize === 'a3' ? 10 : 8,
                cellPadding: 2,
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                valign: 'middle',
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'center',
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                sno: { halign: 'center', cellWidth: 10 },
                desc: { halign: 'left' }, // Auto width
                hsn: { halign: 'center', cellWidth: 20 },
                qty: { halign: 'center', cellWidth: 15 },
                unit: { halign: 'center', cellWidth: 15 },
                mrp: { halign: 'right', cellWidth: 20 },
                price: { halign: 'right', cellWidth: 20 },
                gst: { halign: 'right', cellWidth: 15 },
                rate: { halign: 'right', cellWidth: 20 },
                amount: { halign: 'right', cellWidth: 25 },
            },
            // Draw table outer border manually if needed, but grid handles it.
            // Remove 'foot' here, we'll draw a dedicated Totals box attached to the table.
        });

        const finalY = (doc as any).lastAutoTable.finalY as number;

        // --- FOOTER CHECK ---
        const footerHeight = 60;
        const remainingHeight = pageHeight - margin - finalY;
        let footerY = finalY;

        if (remainingHeight < footerHeight) {
            doc.addPage();
            footerY = margin + 10;
            // Draw top line for new page
            doc.line(margin, footerY, margin + contentWidth, footerY);
        }

        // --- SECTION 4: TOTALS & AMOUNT IN WORDS ---
        const totalsHeight = 25;

        // Main Footer Box
        doc.rect(margin, footerY, contentWidth, totalsHeight);

        // Vertical Divider for Totals (align with Amount column approximately)
        // Amount column is last, width 25. Width of page - 25 roughly?
        // Let's align with the last vertical line of table.
        // Table Width = ContentWidth.
        const totalsSectionWidth = 55; // Covers Rate + Amount columns roughly
        const totalsDividerX = margin + contentWidth - totalsSectionWidth;

        doc.line(totalsDividerX, footerY, totalsDividerX, footerY + totalsHeight);

        // -- Left Side: Amount in Words --
        const wordsY = footerY + 8;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Invoice Amount In Words :", margin + 2, wordsY);
        doc.setFont("helvetica", "bold");
        doc.text(`${numToWords(Math.round(totalAmount))} Rupees Only`, margin + 2, wordsY + 6, { maxWidth: contentWidth - totalsSectionWidth - 5 });

        // -- Right Side: Totals --
        doc.setFontSize(9);
        const rightColLabelX = totalsDividerX + 2;
        const rightColValX = margin + contentWidth - 2;

        // Sub Total
        doc.setFont("helvetica", "normal");
        doc.text("Sub Total", rightColLabelX, footerY + 7);
        doc.text(subTotal.toFixed(2), rightColValX, footerY + 7, { align: 'right' });

        // Tax (Optional split)
        // doc.text("CGST+SGST", rightColLabelX, footerY + 12);
        // ...

        // Total
        doc.setFont("helvetica", "bold");
        doc.line(totalsDividerX, footerY + 16, margin + contentWidth, footerY + 16); // Separator
        doc.text("Total", rightColLabelX, footerY + 21);
        doc.text(totalAmount.toFixed(2), rightColValX, footerY + 21, { align: 'right' });


        // --- SECTION 5: TERMS & BANK & SIGNATURE ---
        const lowerFooterY = footerY + totalsHeight;
        const lowerFooterHeight = 40;

        // Container
        doc.rect(margin, lowerFooterY, contentWidth, lowerFooterHeight);

        // Vertical Split (Center)
        doc.line(centerX, lowerFooterY, centerX, lowerFooterY + lowerFooterHeight);

        // -- Left: Terms & Bank --

        // Terms
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Terms And Conditions:", margin + 2, lowerFooterY + 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(paperSize === 'a3' ? 8 : 6);
        const terms = doc.splitTextToSize("1. Subject to Chennai Jurisdiction. 2. No Liability accepted for any breakage/damage during transit. 3. Interest @ 24% will be charged if not paid within due date.", (contentWidth / 2) - 5);
        doc.text(terms, margin + 2, lowerFooterY + 9);

        // Horizontal Line separator for Bank details
        const bankLineY = lowerFooterY + 18;
        doc.line(margin, bankLineY, centerX, bankLineY);

        // Bank Details
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Bank Details:", margin + 2, bankLineY + 4);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Bank: ${activeCompany.bank}`, margin + 25, bankLineY + 4);
        doc.text(`A/c: ${activeCompany.ac}`, margin + 25, bankLineY + 8);
        doc.text(`IFSC: ${activeCompany.ifsc}`, margin + 25, bankLineY + 12);
        doc.text(`Branch: ${activeCompany.branch}`, margin + 25, bankLineY + 16);

        // QR Code Placeholder
        doc.rect(margin + 2, bankLineY + 6, 15, 12);
        doc.setFontSize(5);
        doc.text("QR", margin + 6, bankLineY + 12);


        // -- Right: Signatory --
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`For ${activeCompany.name}`, centerX + 2, lowerFooterY + 5);

        if (signature) {
            doc.addImage(signature, 'PNG', centerX + 30, lowerFooterY + 10, 30, 15);
        }

        doc.text("Authorized Signatory", centerX + 45, lowerFooterY + 35, { align: 'center' });

        doc.autoPrint();
        return doc;
    };

    const handleDownloadPDF = async () => {
        handleSaveInvoice();
        const doc = await generatePDFDocument();
        doc.save(`Invoice_${invoiceNo}.pdf`);
    };

    const handleSaveInvoice = () => {
        const invoiceData = {
            companyName: currentCompany,
            invoiceNo,
            date,
            time,
            placeOfSupply,
            customer: {
                name: customerName,
                address: customerAddress,
                state: customerState,
                gstin: customerGSTIN
            },
            items: items.map(i => ({
                id: i.id,
                description: i.description,
                hsn: i.hsn,
                quantity: i.quantity,
                unit: i.unit,
                mrp: i.mrp,
                price: i.price,
                gstRate: i.gstRate,
                costPrice: i.price * 0.7 // Mock cost price if needed
            })),
            paymentMode: "CASH" as const,
            settings: {
                paperSize,
                logo: logo,
                signature: signature
            }
        };

        addInvoice(invoiceData, { name: "Admin User", role: "ADMIN" }, "Office");
        if (onInvoiceCreated) {
            onInvoiceCreated();
        }
    };

    const handlePreviewPDF = async () => {
        const doc = await generatePDFDocument();
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPreviewUrl(url);
    };

    const { totalAmount } = calculateTotals();

    useEffect(() => {
        // Trigger onSave callback if provided when invoice is successfully added
        // Note: The addInvoice function in context is async but doesn't return a promise in current definition
        // We will assume that if we are here, we can trigger a refresh via callback
    }, []);

    return (
        <Card className="w-full max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle>Invoice Generator ({activeCompany.name})</CardTitle>
                <CardDescription>Generate exact replica PDF invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Header Inputs */}
                <div className="flex justify-end gap-2">
                    <span className="text-sm font-medium self-center">Paper Size:</span>
                    <Button
                        size="sm"
                        variant={paperSize === 'a4' ? "default" : "outline"}
                        onClick={() => setPaperSize('a4')}
                    >
                        A4
                    </Button>
                    <Button
                        size="sm"
                        variant={paperSize === 'a3' ? "default" : "outline"}
                        onClick={() => setPaperSize('a3')}
                    >
                        A3
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium">Business Logo</label>
                        <Input key="logo-input" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                        <p className="text-[10px] text-muted-foreground">Upload your company logo (JPG/PNG)</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium">Digital Signature</label>
                        <Input key="sig-input" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'signature')} />
                        <p className="text-[10px] text-muted-foreground">Upload authorized signatory signature</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 bg-muted/20 p-4 rounded-lg">
                    <div>
                        <label className="text-xs font-medium">Invoice No</label>
                        <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="h-8" />
                    </div>
                    <div>
                        <label className="text-xs font-medium">Date</label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8" />
                    </div>
                    <div>
                        <label className="text-xs font-medium">Time</label>
                        <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-8" />
                    </div>
                    <div>
                        <label className="text-xs font-medium">Place of Supply</label>
                        <Input value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} className="h-8" />
                    </div>
                </div>

                {/* Customer Details */}
                <div className="border p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold">Bill To Details</label>
                        <div className="flex gap-2">
                            {/* Customer Select Dropdown (Simple implementation) */}
                            <select
                                className="h-8 text-xs border rounded px-2"
                                onChange={(e) => {
                                    const c = customers.find(cus => cus.id === e.target.value);
                                    if (c) handleSelectCustomer(c);
                                }}
                                value=""
                            >
                                <option value="" disabled>Select Saved Customer...</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSaveCustomer}
                                className="h-8"
                            >
                                <Save className="h-3 w-3 mr-1" /> Save Customer
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Input placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Address"
                                value={customerAddress}
                                onChange={e => setCustomerAddress(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Input placeholder="State (e.g. 33-Tamil Nadu)" value={customerState} onChange={e => setCustomerState(e.target.value)} />
                            <Input placeholder="GSTIN" value={customerGSTIN} onChange={e => setCustomerGSTIN(e.target.value)} />
                            {/* Hidden/Future fields for Phone/Email if needed */}
                        </div>
                    </div>
                </div>

                {/* Item Table Form */}
                <div className="space-y-4">
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-2 w-8">#</th>
                                    <th className="p-2 text-left">Item Name</th>
                                    <th className="p-2 w-24">HSN</th>
                                    <th className="p-2 w-16">Qty</th>
                                    <th className="p-2 w-16">Unit</th>
                                    <th className="p-2 w-24">MRP</th>
                                    <th className="p-2 w-24">Price</th>
                                    <th className="p-2 w-16">GST%</th>
                                    <th className="p-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id} className="border-t">
                                        <td className="p-2 text-center">{idx + 1}</td>
                                        <td className="p-2">
                                            <Input className="h-7 text-xs" value={item.description || ''} onChange={e => updateItem(item.id, "description", e.target.value)} />
                                        </td>
                                        <td className="p-2">
                                            <Input className="h-7 text-xs" value={item.hsn || ''} onChange={e => updateItem(item.id, "hsn", e.target.value)} />
                                        </td>
                                        <td className="p-2">
                                            <Input className="h-7 text-xs" type="number" value={item.quantity || 0} onChange={e => updateItem(item.id, "quantity", Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <Input className="h-7 text-xs" value={item.unit || ''} onChange={e => updateItem(item.id, "unit", e.target.value)} />
                                        </td>
                                        <td className="p-2">
                                            <Input className="h-7 text-xs" type="number" value={item.mrp || 0} onChange={e => updateItem(item.id, "mrp", Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <Input className="h-7 text-xs" type="number" value={item.price || 0} onChange={e => updateItem(item.id, "price", Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <Input className="h-7 text-xs" type="number" value={item.gstRate || 0} onChange={e => updateItem(item.id, "gstRate", Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteItem(item.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button size="sm" variant="outline" onClick={addItem} className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Add New Item
                    </Button>
                </div>
            </CardContent>

            <CardFooter className="justify-between bg-muted/10 p-4">
                <div className="text-sm font-medium">
                    Total Amount: <span className="text-lg font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            shareReportOnWhatsApp(`Invoice #${invoiceNo}`, {
                                Customer: customerName,
                                Amount: `₹{totalAmount.toFixed(2)}`,
                                Date: date
                            });
                        }}
                    >
                        <Share2 className="h-4 w-4 mr-2" /> Share WhatsApp
                    </Button>
                    <Button variant="outline" onClick={handlePreviewPDF}>
                        Preview PDF
                    </Button>
                    <Button variant="outline" onClick={handleSaveInvoice}>
                        <Save className="h-4 w-4 mr-2" /> Save Only
                    </Button>
                    <Button onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" /> Download PDF
                    </Button>
                </div>
            </CardFooter>

            <Modal
                isOpen={!!previewUrl}
                onClose={() => setPreviewUrl(null)}
                title={`Preview Invoice - ${invoiceNo}`}
                className="max-w-5xl h-[90vh]"
            >
                {previewUrl && (
                    <iframe
                        src={previewUrl}
                        className="w-full h-[calc(90vh-60px)]"
                        title="PDF Preview"
                    />
                )}
            </Modal>
        </Card>
    );
}
