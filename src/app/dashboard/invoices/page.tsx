"use client";

import { useInvoice } from "@/lib/invoice-context";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Printer, MapPin, User, Clock, CheckCircle, Plus, FileText, DollarSign, Bell, Search, Download, Calendar, Filter } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { generateInvoicePDF } from "@/lib/invoice-utils";
import { updateInvoicePaymentAction } from "@/actions/invoice";
import { useRouter } from "next/navigation";
import { sendInvoiceWhatsAppAction } from "@/actions/communication";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function InvoicesPage() {
    const { invoices, notifications } = useInvoice();
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'PRINTED'>('ALL');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
    const router = useRouter();

    // Advanced filtering and search
    const displayedInvoices = useMemo(() => {
        let filtered = invoices;

        // Status filter
        if (filter === 'PENDING') {
            filtered = filtered.filter(inv => inv.status === 'GENERATED' || inv.status === 'PENDING');
        } else if (filter === 'PAID') {
            filtered = filtered.filter(inv => inv.status === 'PAID');
        } else if (filter === 'PRINTED') {
            filtered = filtered.filter(inv => inv.status === 'PRINTED');
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(inv =>
                inv.invoiceNo.toLowerCase().includes(term) ||
                inv.customer.name.toLowerCase().includes(term) ||
                inv.customer.address.toLowerCase().includes(term) ||
                inv.totalAmount.toString().includes(term)
            );
        }

        // Date range filter
        if (dateRange.from) {
            const fromDate = new Date(dateRange.from);
            filtered = filtered.filter(inv => new Date(inv.date) >= fromDate);
        }
        if (dateRange.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59);
            filtered = filtered.filter(inv => new Date(inv.date) <= toDate);
        }

        return filtered;
    }, [invoices, filter, searchTerm, dateRange]);

    const handleExportCSV = () => {
        const headers = ['Invoice No', 'Date', 'Customer', 'Amount', 'Payment Mode', 'Status'];
        const rows = displayedInvoices.map(inv => [
            inv.invoiceNo,
            inv.date,
            inv.customer.name,
            inv.totalAmount.toFixed(2),
            inv.paymentMode || 'CASH',
            inv.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Invoice data exported to CSV');
    };

    const handleView = async (invoice: any) => {
        // Re-generate PDF blob for preview
        const doc = await generateInvoicePDF(invoice); // StoredInvoice matches InvoiceData structure
        const blob = doc.output('blob');
        setPreviewUrl(URL.createObjectURL(blob));
    };

    const handlePrint = async (invoice: any) => {
        const doc = await generateInvoicePDF(invoice);
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');

        // Mark as printed automatically
        if (invoice.status === 'GENERATED' || invoice.status === 'PENDING') {
            await updateInvoicePaymentAction(invoice.invoiceNo, 'PRINTED', invoice.paymentMode);
            router.refresh();
        }
    };

    const handleWhatsApp = async (invoice: any) => {
        const promise = sendInvoiceWhatsAppAction(invoice, "91" + (invoice.customer.phone || "9677150152")); // Use mock phone for fallback or user's
        toast.promise(promise, {
            loading: 'Generating and Sending Invoice...',
            success: (data) => data.message,
            error: 'Failed to send WhatsApp'
        });
    };

    return (
        <PageShell
            title="Invoice Management"
            description="Track and manage generated invoices from all users."
            action={
                <div className="flex gap-2">
                    <Link href="/dashboard/invoices/bulk">
                        <Button variant="outline" className="gap-2">
                            <CheckCircle className="h-4 w-4" /> Bulk Order
                        </Button>
                    </Link>
                    <Link href="/dashboard/pos">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Start New Invoice
                        </Button>
                    </Link>
                </div>
            }
        >
            <div className="grid gap-6">

                {/* Premium Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card variant="metric" className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                Total Generated
                                <FileText className="h-4 w-4 text-blue-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-3xl font-bold">{invoices.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">All invoices</p>
                        </CardContent>
                    </Card>
                    <Card variant="metric" className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center justify-between text-orange-600">
                                Pending Print
                                <Printer className="h-4 w-4 text-orange-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-3xl font-bold text-orange-600">{invoices.filter(i => i.status === 'GENERATED' || i.status === 'PENDING').length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
                        </CardContent>
                    </Card>
                    <Card variant="metric" className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center justify-between text-emerald-600">
                                Total Value
                                <DollarSign className="h-4 w-4 text-emerald-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-3xl font-bold text-emerald-600">₹{invoices.reduce((acc, i) => acc + i.totalAmount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total revenue</p>
                        </CardContent>
                    </Card>
                    <Card variant="metric" className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center justify-between text-purple-600">
                                Notifications
                                <Bell className="h-4 w-4 text-purple-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-3xl font-bold text-purple-600">{notifications.filter(n => !n.read).length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Unread alerts</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Advanced Filters and Search */}
                <Card variant="premium" className="p-4">
                    <div className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-10"
                                placeholder="Search by invoice no, customer name, address, or amount..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Date Range and Status Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    From Date
                                </label>
                                <Input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    To Date
                                </label>
                                <Input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Filter className="h-3 w-3" />
                                    Status
                                </label>
                                <div className="flex gap-1 flex-wrap">
                                    <Button
                                        variant={filter === 'ALL' ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setFilter('ALL')}
                                    >
                                        All
                                    </Button>
                                    <Button
                                        variant={filter === 'PENDING' ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setFilter('PENDING')}
                                    >
                                        Pending
                                    </Button>
                                    <Button
                                        variant={filter === 'PAID' ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setFilter('PAID')}
                                    >
                                        Paid
                                    </Button>
                                    <Button
                                        variant={filter === 'PRINTED' ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setFilter('PRINTED')}
                                    >
                                        Printed
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Export</label>
                                <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleExportCSV}>
                                    <Download className="h-3 w-3 mr-1" />
                                    Export CSV
                                </Button>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="text-sm text-muted-foreground">
                            Showing {displayedInvoices.length} of {invoices.length} invoices
                        </div>
                    </div>
                </Card>

                {/* Invoice List */}
                <Card variant="premium">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium">
                                    <tr>
                                        <th className="p-4">Invoice No</th>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">Mode</th>
                                        <th className="p-4">Generated By</th>
                                        <th className="p-4">Location & Time</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {displayedInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-muted-foreground">No invoices found.</td>
                                        </tr>
                                    ) : (
                                        displayedInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-muted/10">
                                                <td className="p-4 font-medium">{inv.invoiceNo}</td>
                                                <td className="p-4">
                                                    <div className="font-medium">{inv.customer.name}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">{inv.customer.address}</div>
                                                </td>
                                                <td className="p-4 font-bold">₹{inv.totalAmount.toFixed(2)}</td>
                                                <td className="p-4">
                                                    <div className={`text-xs px-2 py-1 rounded inline-block font-medium border ${inv.paymentMode === 'UPI' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                        inv.paymentMode === 'CASH' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            inv.paymentMode === 'CHEQUE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {inv.paymentMode || 'CASH'}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-3 w-3 text-primary" />
                                                        <span className="font-medium">{inv.generatedBy.name}</span>
                                                    </div>
                                                    <div className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 inline-block mt-1 uppercase tracking-tighter">
                                                        {inv.generatedBy.role}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {inv.generatedAt.date} {inv.generatedAt.time}</div>
                                                    <div className="flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {inv.generatedAt.location || "N/A"}</div>
                                                </td>
                                                <td className="p-4">
                                                    {inv.status === 'GENERATED' || inv.status === 'PENDING' ? (
                                                        <span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-1 rounded text-xs font-medium">Pending Print</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-medium"><CheckCircle className="h-3 w-3" /> Printed</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleWhatsApp(inv)} title="Send via WhatsApp">
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5Z" clipRule="evenodd" />
                                                            </svg>
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleView(inv)}><Eye className="h-4 w-4" /></Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePrint(inv)}><Printer className="h-4 w-4" /></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {previewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background w-full max-w-4xl h-[85vh] rounded-lg shadow-xl overflow-hidden flex flex-col relative">
                        <Button className="absolute right-4 top-4 z-10" variant="destructive" size="sm" onClick={() => setPreviewUrl(null)}>Close</Button>
                        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full" title="Invoice Preview" />
                    </div>
                </div>
            )}
        </PageShell>
    );
}
