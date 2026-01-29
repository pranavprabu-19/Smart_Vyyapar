
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
    // Default to A5 as requested per new requirements
    const paperSize = data.settings?.paperSize || 'a5';
    const isGST = data.settings?.isGST !== false; // Default true

    // Define Custom Sizes if not standard
    let format: string | number[] = paperSize;
    let unit: 'mm' | 'pt' = 'mm';
    if (paperSize === 'thermal-2') {
        format = [58, 200]; // 58mm width, 200mm height (adjustable/roll)
    } else if (paperSize === 'thermal-3') {
        format = [80, 200]; // 80mm width
    }

    const doc = new jsPDF({ format: format as any, unit: 'mm' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const isThermal = paperSize.startsWith('thermal');
    const margin = isThermal ? 2 : 10;
    const contentWidth = pageWidth - (margin * 2);
    const centerX = pageWidth / 2;
    const col1X = margin + (isThermal ? 0 : 4);
    const col2X = centerX + (isThermal ? 0 : 4); // For thermal, might need single column look


    // Load Images Helper - Universal (works in Node and Browser)
    const loadImg = async (path: string): Promise<string | Uint8Array | null> => {
        try {
            if (typeof window === 'undefined') {
                // Server Side
                const fs = require('fs/promises');
                const p = require('path');
                // Assuming images are in public folder
                // remove leading slash
                const relPath = path.startsWith('/') ? path.slice(1) : path;
                const fullPath = p.join(process.cwd(), 'public', relPath);
                const buffer = await fs.readFile(fullPath);
                return buffer;
            } else {
                // Client Side
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = path;
                    img.onload = () => resolve(path); // jsPDF addImage works with path/url in browser if loaded? actually it needs base64 often or just path if same domain
                    // Better to just return path if using jsPDF in browser, or fetch blob
                    img.onerror = () => resolve(null);
                });
            }
        } catch (e) {
            console.warn("Img load failed (Server): " + path);
            return null;
        }
    };

    let logoImg = data.settings?.logo;
    let signatureImg = data.settings?.signature;

    // Pre-load if not provided in settings
    if (!logoImg) logoImg = "/images/logo.jpg";
    if (!signatureImg) signatureImg = "/images/signature.jpg";

    // 0. Top Title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(isGST ? "Tax Invoice" : "ESTIMATE", centerX, 8, { align: 'center' });

    // --- SECTION 1: HEADER (Logo, Company) ---
    const startY = 12;
    const headerHeight = paperSize === 'a5' ? 40 : 35; // More height for A5 wrapping

    doc.setLineWidth(0.1);
    doc.rect(margin, startY, contentWidth, headerHeight);

    // LOGO Placement
    if (logoImg) {
        try {
            const logoData = await loadImg(logoImg);
            if (logoData) {
                doc.addImage(logoData, 'JPEG', margin + 2, startY + 2, 25, 25);
            }
        } catch (e) { /* Ignore */ }
    }

    // Company Details (Centered & Wrapped)
    const textStartX = margin + 30; // Shift text right to avoid logo
    const textWidth = contentWidth - 35; // Available width for text
    const textCenterX = textStartX + (textWidth / 2);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.companyName, textCenterX, startY + 8, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(activeCompany.address, textWidth);
    doc.text(addressLines, textCenterX, startY + 14, { align: 'center' });

    doc.text(`Phone: ${activeCompany.phone}`, textCenterX, startY + 24, { align: 'center' });
    if (isGST) {
        doc.text(`GSTIN: ${activeCompany.gstin}`, textCenterX, startY + 28, { align: 'center' });
    }

    // --- SECTION 2: CUSTOMER & INVOICE DETAILS ---
    const infoY = startY + headerHeight;
    const infoHeight = 35;

    doc.rect(margin, infoY, contentWidth, infoHeight);
    doc.line(centerX, infoY, centerX, infoY + infoHeight);

    // Common Font settings
    const labelFontSize = 8;
    const valFontSize = 9;
    const lineHeight = 4.5;

    // -- Left Side: Bill To --
    let cursorY = infoY + 5;
    doc.setFontSize(labelFontSize);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", col1X, cursorY);

    cursorY += lineHeight;
    doc.setFontSize(valFontSize);
    doc.text(data.customer.name, col1X, cursorY);

    cursorY += 1; // small gap
    doc.setFont("helvetica", "normal");
    const custAddr = doc.splitTextToSize(data.customer.address, (contentWidth / 2) - 8);
    doc.text(custAddr, col1X, cursorY + 4);

    if (isGST && data.customer.gstin) {
        const custBottomY = infoY + infoHeight - 5;
        doc.setFont("helvetica", "bold");
        doc.text(`GSTIN: ${data.customer.gstin}`, col1X, custBottomY);
    }

    // -- Right Side: Invoice Details --
    cursorY = infoY + 6;
    const rightLabelX = col2X;
    const rightValX = col2X + 25; // Adjusted for tight A5 space

    const printRow = (label: string, val: string) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(labelFontSize);
        doc.text(label, rightLabelX, cursorY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(valFontSize);
        doc.text(val, rightValX, cursorY);
        cursorY += lineHeight;
    };

    printRow("Inv No", `: ${data.invoiceNo}`);
    printRow("Date", `: ${data.date}`);
    printRow("Time", `: ${data.time || ''}`);
    printRow("Mode", `: ${data.paymentMode || 'CASH'}`);


    // --- SECTION 3: ITEMS TABLE ---
    const tableY = infoY + infoHeight;

    const tableColumn = [
        { header: 'Item', dataKey: 'desc' },
        { header: 'Qty', dataKey: 'qty' },
        { header: 'Rate', dataKey: 'price' },
        { header: 'Amt', dataKey: 'amount' },
    ];

    if (isGST) {
        tableColumn.splice(2, 0, { header: 'GST', dataKey: 'gst' });
    }

    const tableRows = data.items.map((item) => {
        const taxable = item.quantity * item.price;
        const gstAmount = (taxable * item.gstRate) / 100;
        const total = isGST ? (taxable + gstAmount) : taxable;

        return {
            desc: item.description,
            qty: item.quantity,
            price: item.price.toFixed(2),
            gst: `${item.gstRate}%`,
            amount: total.toFixed(2),
        };
    });

    // Min Rows
    while (tableRows.length < 5) {
        // @ts-ignore
        tableRows.push({ desc: '', qty: '', price: '', gst: '', amount: '' });
    }

    const { subTotal, totalAmount } = calculateInvoiceTotals(data.items);

    (autoTable as any)(doc, {
        columns: tableColumn,
        body: tableRows,
        startY: tableY,
        theme: 'grid',
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            valign: 'middle'
        },
        columnStyles: {
            desc: { halign: 'left' },
            qty: { halign: 'center', cellWidth: 10 },
            gst: { halign: 'center', cellWidth: 10 },
            price: { halign: 'right', cellWidth: 15 },
            amount: { halign: 'right', cellWidth: 20 },
        },
    });

    const finalY = (doc as any).lastAutoTable.finalY as number;

    // --- FOOTER CHECK ---
    const footerHeight = 60;
    if (pageHeight - finalY < footerHeight) doc.addPage();
    let footerY = (doc as any).lastAutoTable.finalY;

    // --- SECTION 4: FOOTER ---
    doc.rect(margin, footerY, contentWidth, 30);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Amount in Words:", margin + 2, footerY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(`${numToWords(Math.round(totalAmount))} Rupees Only`, margin + 2, footerY + 10, { maxWidth: contentWidth - 40 });

    // Totals
    const rX = margin + contentWidth - 40;
    const rValX = margin + contentWidth - 2;

    doc.setFont("helvetica", "bold");
    doc.text("Total:", rX, footerY + 25);
    doc.text(totalAmount.toFixed(2), rValX, footerY + 25, { align: 'right' });


    // --- SECTION 5: FINAL BLOCK ---
    const lastBlockY = footerY + 30;
    doc.rect(margin, lastBlockY, contentWidth, 35);

    // Bank Details (Compact for A5)
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Details:", margin + 2, lastBlockY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`Bank: ${activeCompany.bank}`, margin + 2, lastBlockY + 9);
    doc.text(`A/c: ${activeCompany.ac} | IFSC: ${activeCompany.ifsc}`, margin + 2, lastBlockY + 13);

    // QR Code
    let qrCodeDataUrl: string | null = null;
    if (activeCompany.upiId) {
        try {
            const upiString = generateUPIString(activeCompany.upiId, data.companyName, totalAmount, data.invoiceNo);
            qrCodeDataUrl = await QRCode.toDataURL(upiString, { errorCorrectionLevel: 'M' });
        } catch (err) { }
    }

    if (qrCodeDataUrl) {
        const qrSize = 25;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Scan to Pay", centerX, lastBlockY + 2, { align: 'center' });
        doc.addImage(qrCodeDataUrl, 'PNG', centerX - (qrSize / 2), lastBlockY + 4, qrSize, qrSize);
    }

    // Signature
    doc.setFontSize(8);
    doc.text("Authorized Signatory", margin + contentWidth - 30, lastBlockY + 25, { align: 'center' });
    if (signatureImg) {
        try {
            const sigData = await loadImg(signatureImg);
            if (sigData) {
                doc.addImage(sigData, 'JPEG', margin + contentWidth - 30, lastBlockY + 10, 20, 10);
            }
        } catch (e) { }
    }

    return doc;
};
