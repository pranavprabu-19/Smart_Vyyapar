
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

export interface InvoiceItem {
    id: string | number;
    description: string;
    hsn: string;
    quantity: number;
    unit: string;
    mrp: number;
    price: number; // Taxable Value
    costPrice?: number; // Cost Price for Profit Calc
    gstRate: number;
}

export interface InvoiceData {
    companyName: string;
    invoiceNo: string;
    date: string;
    time: string;
    placeOfSupply: string;
    employeeId?: string; // ID of employee creating it
    customer: {
        name: string;
        address: string;
        state: string;
        gstin: string;
        phone?: string;
        email?: string;
        lat?: number;
        lng?: number;
    };
    items: InvoiceItem[];
    paymentMode?: "CASH" | "UPI" | "CHEQUE" | "CREDIT";
    status?: "PAID" | "PENDING" | "CANCELLED" | "GENERATED" | "PRINTED" | "DISPATCHED" | "DELIVERED";

    // Advanced billing features (optional, won't break existing invoices)
    discount?: {
        type?: 'PERCENTAGE' | 'FIXED';
        value?: number;
        description?: string;
    };
    partialPayment?: {
        amount?: number;
        remaining?: number;
    };

    godownId?: string; // Origin Godown
    settings?: {
        paperSize?: 'a4' | 'a3' | 'a5' | 'thermal-2' | 'thermal-3';
        logo?: string | null;
        signature?: string | null;
        isGST?: boolean;
    };
    companyProfile?: any; // Dynamic company details from DB
}

// Company Details Config
export const COMPANY_DETAILS: Record<string, any> = {
    "Sai Associates": {
        address: "Admin Office: 29 Mettu Street, Ch -69 | Godown: P.No.13, Nalleeswarar Nagar Main Road, Venkatapuram, Chennai-69",
        phone: "+91 9677150152",
        email: "saiassociates2022@outlook.com",
        gstin: "33AWRPN5543N1ZU",
        bank: "BANK OF BARODA",
        ac: "69000200001485",
        ifsc: "BARB0VJKUTH",
        branch: "Pallavaram",
        upiId: "9677150152@okbizaxis",
        qrCode: "/sai-associates-qr.jpg"
    },
    "SNK Distributors": {
        address: "No. 45, Industrial Estate, Guindy, Chennai - 600032",
        phone: "+91 9840012345",
        email: "accounts@snkdistributors.com",
        gstin: "33AAACS1429K1Z1",
        bank: "HDFC BANK",
        ac: "50200012345678",
        ifsc: "HDFC0001234",
        branch: "Guindy"
    }
};

// Simple Number to Words for Indian Rupees
export const numToWords = (n: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + numToWords(n % 100);
    return numToWords(Math.floor(n / 1000)) + 'Thousand ' + numToWords(n % 1000);
};

export const calculateInvoiceTotals = (items: InvoiceItem[]) => {
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

export const generateUPIString = (upiId: string, name: string, amount: number, invoiceNo: string): string => {
    // UPI URL Format: upi://pay?pa={upiId}&pn={name}&am={amount}&tr={invoiceNo}&cu=INR
    // URLSearchParams uses '+' for spaces, but some UPI apps prefer '%20'
    // We'll use encodeURIComponent manually for safety
    const params = [
        `pa=${encodeURIComponent(upiId)}`,
        `pn=${encodeURIComponent(name)}`,
        `am=${amount.toFixed(2)}`,
        `tr=${encodeURIComponent(invoiceNo)}`,
        `cu=INR`
    ];

    return `upi://pay?${params.join('&')}`;
};

export const generateInvoicePDF = async (data: InvoiceData): Promise<jsPDF> => {
    // Priority: 1. Passed in companyProfile (DB), 2. Hardcoded Match, 3. Fallback
    const activeCompany = data.companyProfile || COMPANY_DETAILS[data.companyName] || COMPANY_DETAILS["Sai Associates"];
    const isGST = data.settings?.isGST !== false; // Default true

    // Permanent A5 Size 
    // A5 Dimensions: 148 x 210 mm
    const doc = new jsPDF({ format: 'a5', unit: 'mm' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 5;
    const contentWidth = pageWidth - (margin * 2);
    const centerX = pageWidth / 2;

    // Load Images Helper - Universal (works in Node and Browser)
    const loadImg = async (path: string): Promise<string | Uint8Array | null> => {
        try {
            if (typeof window === 'undefined') {
                const fs = require('fs/promises');
                const p = require('path');
                const relPath = path.startsWith('/') ? path.slice(1) : path;
                const fullPath = p.join(process.cwd(), 'public', relPath);
                return await fs.readFile(fullPath);
            } else {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = path;
                    img.onload = () => resolve(path);
                    img.onerror = () => resolve(null);
                });
            }
        } catch (e) {
            console.warn("Img load failed (Server): " + path);
            return null;
        }
    };

    let logoImg = data.settings?.logo || "/images/logo.jpg";

    let currentY = margin;
    const bottomMargin = 5;
    const boxHeight = pageHeight - margin - bottomMargin;

    // Outer Master Box
    doc.setLineWidth(0.2);
    doc.rect(margin, margin, contentWidth, boxHeight);

    // --- 1. "Tax Invoice" Header ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Tax Invoice", centerX, currentY + 4, { align: "center" });
    currentY += 6;

    doc.setLineWidth(0.2);
    doc.line(margin, currentY, margin + contentWidth, currentY);

    // --- 2. Company Info ---
    const companyStartY = currentY;
    if (logoImg) {
        try {
            const logoData = await loadImg(logoImg);
            if (logoData) {
                doc.addImage(logoData, 'JPEG', margin + 3, currentY + 2, 16, 16); // Logo scaled down slightly
            }
        } catch (e) { /* Ignore */ }
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(data.companyName, centerX, currentY + 6, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let cleanAddress = activeCompany.address || '';
    cleanAddress = cleanAddress.replace(/null\s*-\s*null/gi, '').replace(/\bnull\b/gi, '').replace(/,\s*,/g, ',').trim();
    doc.text(cleanAddress, centerX, currentY + 10, { align: "center" });

    doc.setFontSize(6);
    doc.text(`Phone: ${activeCompany.phone} | Email: ${activeCompany.email || 'N/A'}`, centerX, currentY + 14, { align: "center" });
    doc.text(`GSTIN: ${activeCompany.gstin || 'N/A'} | State: 33-Tamil Nadu`, centerX, currentY + 18, { align: "center" });

    currentY += 21;
    doc.line(margin, currentY, margin + contentWidth, currentY);

    // --- 3. Bill To & Invoice Info ---
    const billToStartY = currentY;

    // Bill To
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Bill To:", margin + 3, currentY + 4);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(data.customer.name, margin + 3, currentY + 8);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    const custAddrLines = doc.splitTextToSize(data.customer.address, (contentWidth / 2) - 8);
    doc.text(custAddrLines, margin + 3, currentY + 12);

    let addrHeight = custAddrLines.length * 3;
    doc.setFont("helvetica", "bold");
    doc.text(`State: 33-Tamil Nadu`, margin + 3, currentY + 12 + addrHeight + 2);
    doc.text(`GSTIN: ${data.customer.gstin || 'N/A'}`, margin + 3, currentY + 12 + addrHeight + 6);

    // Invoice Info right side
    const midX = centerX;
    doc.line(midX, billToStartY, midX, currentY + 23); // Vertical line separator

    const infoX = midX + 3;
    const infoValX = midX + 25;

    let infY = currentY + 4;
    const pInfo = (lbl: string, val: string) => {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(lbl, infoX, infY);
        doc.setFont("helvetica", "bold");
        doc.text(`: ${val}`, infoValX, infY);
        infY += 4;
    }

    pInfo("Invoice No", data.invoiceNo);
    pInfo("Date", data.date);
    pInfo("Time", data.time || 'N/A');
    pInfo("Place of Supply", "33-Tamil Nadu");
    pInfo("Payment Mode", data.paymentMode || 'CASH');

    currentY += 23;
    doc.line(margin, currentY, margin + contentWidth, currentY);

    // --- 4. Table ---
    const tableColumn = [
        { header: 'S.N', dataKey: 'sno' },
        { header: 'Item Name', dataKey: 'desc' },
        { header: 'HSN', dataKey: 'hsn' },
        { header: 'Qty', dataKey: 'qty' },
        { header: 'Unit', dataKey: 'unit' },
        { header: 'Price', dataKey: 'rate' },
        { header: 'GST', dataKey: 'gstRate' },
        { header: 'Amount', dataKey: 'total' },
    ];

    let totalSno = 1;
    const tableRows = data.items.map((item) => {
        const taxableValue = item.quantity * item.price;
        const gstAmount = (taxableValue * item.gstRate) / 100;
        const totalAmount = isGST ? (taxableValue + gstAmount) : taxableValue;

        return {
            sno: totalSno++,
            desc: item.description,
            hsn: isGST ? (item.hsn || '2201') : '-',
            qty: item.quantity.toString(),
            unit: item.unit || 'PCS',
            rate: item.price.toFixed(2),
            gstRate: isGST ? `${item.gstRate}%` : '-',
            total: totalAmount.toFixed(2),
        };
    });

    // Pad with empty rows to stretch table down (scaled for A5 constraint)
    while (tableRows.length < 13) {
        // @ts-ignore
        tableRows.push({ sno: '', desc: '', hsn: '', qty: '', unit: '', rate: '', gstRate: '', total: '' });
    }

    (autoTable as any)(doc, {
        columns: tableColumn,
        body: tableRows,
        startY: currentY,
        theme: 'grid',
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            lineWidth: 0.2,
            lineColor: [0, 0, 0],
            fontSize: 6
        },
        styles: {
            fontSize: 6,
            cellPadding: 2,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            valign: 'middle'
        },
        columnStyles: {
            sno: { halign: 'center', cellWidth: 7 },
            desc: { halign: 'left', cellWidth: 'auto' },
            hsn: { halign: 'center', cellWidth: 12 },
            qty: { halign: 'center', cellWidth: 8 },
            unit: { halign: 'center', cellWidth: 9 },
            rate: { halign: 'right', cellWidth: 13 },
            gstRate: { halign: 'center', cellWidth: 9 },
            total: { halign: 'right', cellWidth: 16 },
        },
    });

    currentY = (doc as any).lastAutoTable.finalY as number;

    // --- 5. Totals & Words ---
    const totalsBlockHeight = 16;
    const totalsSplitX = margin + contentWidth - 45; // Positioning for A5 width
    
    // Middle vertical line separating Amount in words and totals
    doc.line(totalsSplitX, currentY, totalsSplitX, currentY + totalsBlockHeight);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("Amount in Words:", margin + 2, currentY + 4);

    const { totalAmount } = calculateInvoiceTotals(data.items);
    let finalGrandTotal = totalAmount;
    if (data.discount?.value) {
        if (data.discount.type === 'PERCENTAGE') {
            finalGrandTotal -= (finalGrandTotal * data.discount.value) / 100;
        } else {
            finalGrandTotal -= data.discount.value;
        }
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`${numToWords(Math.round(finalGrandTotal))} Rupees Only`, margin + 2, currentY + 10);

    // Right summary box
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Sub Total:", totalsSplitX + 2, currentY + 5);
    doc.text(totalAmount.toFixed(2), margin + contentWidth - 2, currentY + 5, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.text("Total:", totalsSplitX + 2, currentY + 13);
    doc.text(finalGrandTotal.toFixed(2), margin + contentWidth - 2, currentY + 13, { align: 'right' });

    currentY += totalsBlockHeight;
    doc.setLineWidth(0.2);
    doc.line(margin, currentY, margin + contentWidth, currentY);

    // --- 6. Footer (Bank Details, QR, Signature) ---
    const footerStartY = currentY;

    // Left block: Bank Details
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Details:", margin + 2, currentY + 4);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(`Bank: ${activeCompany.bank} | A/c: ${activeCompany.ac}`, margin + 2, currentY + 8);
    doc.text(`IFSC: ${activeCompany.ifsc} | Branch: ${activeCompany.branch}`, margin + 2, currentY + 12);

    doc.setFontSize(5);
    doc.text("Terms: 1. Subject to Chennai Jurisdiction. 2. Interest @ 24% if delayed.", margin + 2, currentY + 28);

    // Vertical line separating Bank details from Signature Block
    const sigBlockX = centerX + 12;
    doc.line(sigBlockX, footerStartY, sigBlockX, footerStartY + (boxHeight - footerStartY + margin));

    // Center QR Code
    let qrCodeDataUrl: string | null = null;
    if (activeCompany.upiId) {
        try {
            const upiString = generateUPIString(activeCompany.upiId, data.companyName, finalGrandTotal, data.invoiceNo);
            qrCodeDataUrl = await QRCode.toDataURL(upiString, { errorCorrectionLevel: 'M' });
        } catch (err) { }
    }

    if (qrCodeDataUrl) {
        const qrSize = 16;
        doc.addImage(qrCodeDataUrl, 'PNG', centerX - (qrSize / 2), currentY + 5, qrSize, qrSize);
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.text("Scan to Pay", centerX, currentY + 23, { align: 'center' });
    }

    // Right Block: Signature
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(`For ${data.companyName}`, sigBlockX + 2, currentY + 4);

    if (logoImg) {
        try {
            const sigStampData = await loadImg(logoImg);
            if (sigStampData) {
                // Approximate position for the stamp icon
                const stampMaxW = 15;
                doc.addImage(sigStampData, 'JPEG', sigBlockX + ((contentWidth + margin - sigBlockX) / 2) - (stampMaxW / 2), currentY + 7, stampMaxW, stampMaxW);
            }
        } catch (e) { }
    }

    doc.text("Authorized Signatory", sigBlockX + ((contentWidth + margin - sigBlockX) / 2), currentY + 28, { align: 'center' });

    return doc;
};

