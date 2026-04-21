"use client";

import { useState, useEffect, useMemo } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IndianRupee,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Ban,
  Phone,
  MessageCircle,
  Filter,
  Download,
  Send,
  CreditCard,
  TrendingDown,
  Users,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";
import {
  getCollectionMetrics,
  getOverdueCustomers,
  recordPayment,
  type RecordPaymentData,
} from "@/actions/credit";
import {
  getInvoicesForReminder,
  generateReminderMessage,
  logReminder,
  type InvoiceForReminder,
} from "@/actions/reminder";
import { shareReminderMessageViaWhatsApp } from "@/lib/share-utils";
import Link from "next/link";
import { ExportButton } from "@/components/dashboard/export-button";

type OverdueCustomer = {
  customerId: string;
  customerName: string;
  phone: string | null;
  totalOutstanding: number;
  invoiceCount: number;
  oldestDueDate: Date;
  maxDaysPastDue: number;
  tier: string;
  isBlocked: boolean;
};

type CollectionMetrics = {
  totalOutstanding: number;
  collectionsLast30Days: number;
  overdueAmount: number;
  overdueInvoiceCount: number;
  blockedCustomersCount: number;
  pendingInvoiceCount: number;
};

export default function CollectionsPage() {
  const { currentCompany } = useCompany();
  const [metrics, setMetrics] = useState<CollectionMetrics>({
    totalOutstanding: 0,
    collectionsLast30Days: 0,
    overdueAmount: 0,
    overdueInvoiceCount: 0,
    blockedCustomersCount: 0,
    pendingInvoiceCount: 0,
  });
  const [overdueCustomers, setOverdueCustomers] = useState<OverdueCustomer[]>([]);
  const [invoices, setInvoices] = useState<InvoiceForReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDays, setFilterDays] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"customers" | "invoices" | "history">("customers");

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<OverdueCustomer | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    mode: "CASH" as RecordPaymentData["mode"],
    reference: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceForReminder | null>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderPhone, setReminderPhone] = useState("");
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, overdueRes, invoicesRes] = await Promise.all([
        getCollectionMetrics(currentCompany),
        getOverdueCustomers(currentCompany),
        getInvoicesForReminder(currentCompany),
      ]);

      // Set metrics with fallback
      if (metricsRes.success && metricsRes.metrics) {
        setMetrics(metricsRes.metrics);
      } else {
        // Calculate metrics from invoices if available
        const invoicesList = invoicesRes.success && invoicesRes.invoices ? invoicesRes.invoices : [];
        const totalOutstanding = invoicesList.reduce((sum, inv) => sum + inv.balance, 0);
        const overdueInvoices = invoicesList.filter(inv => inv.daysPastDue > 0);
        const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0);
        
        setMetrics({
          totalOutstanding,
          collectionsLast30Days: 0,
          overdueAmount,
          overdueInvoiceCount: overdueInvoices.length,
          blockedCustomersCount: 0,
          pendingInvoiceCount: invoicesList.length,
        });
      }

      if (overdueRes.success && overdueRes.overdueCustomers) {
        setOverdueCustomers(overdueRes.overdueCustomers);
      } else {
        setOverdueCustomers([]);
      }

      if (invoicesRes.success && invoicesRes.invoices) {
        setInvoices(invoicesRes.invoices);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error("Failed to load collections data:", error);
      toast.error("Failed to load collections data");
      // Set empty defaults on error
      setMetrics({
        totalOutstanding: 0,
        collectionsLast30Days: 0,
        overdueAmount: 0,
        overdueInvoiceCount: 0,
        blockedCustomersCount: 0,
        pendingInvoiceCount: 0,
      });
      setOverdueCustomers([]);
      setInvoices([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  // Export to CSV/Excel
  const exportToExcel = () => {
    const data = activeTab === "customers" 
      ? filteredCustomers.map(c => ({
          "Customer Name": c.customerName,
          "Phone": c.phone || "",
          "Outstanding Amount": c.totalOutstanding,
          "Invoice Count": c.invoiceCount,
          "Days Overdue": c.maxDaysPastDue,
          "Tier": c.tier,
          "Blocked": c.isBlocked ? "Yes" : "No",
        }))
      : filteredInvoices.map(inv => ({
          "Invoice No": inv.invoiceNo,
          "Customer": inv.customerName,
          "Phone": inv.customerPhone || "",
          "Invoice Date": formatDate(inv.date),
          "Due Date": formatDate(inv.dueDate),
          "Total Amount": inv.totalAmount,
          "Paid Amount": inv.paidAmount,
          "Balance Due": inv.balance,
          "Days Overdue": inv.daysPastDue,
        }));

    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create CSV content
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const value = (row as any)[h];
        // Escape commas and quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(","))
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collections-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to Excel (CSV)");
  };

  // Export to PDF (simple text-based)
  const exportToPDF = () => {
    const data = activeTab === "customers" ? filteredCustomers : filteredInvoices;
    
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create printable HTML
    const title = activeTab === "customers" ? "Outstanding by Customer" : "Pending Invoices";
    const date = new Date().toLocaleDateString("en-IN");
    
    let tableHTML = "";
    if (activeTab === "customers") {
      tableHTML = `
        <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse;">
          <thead style="background-color: #f3f4f6;">
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Outstanding</th>
              <th>Invoices</th>
              <th>Days Overdue</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCustomers.map(c => `
              <tr>
                <td>${c.customerName}</td>
                <td>${c.phone || "-"}</td>
                <td style="text-align:right;">₹${c.totalOutstanding.toLocaleString()}</td>
                <td style="text-align:center;">${c.invoiceCount}</td>
                <td style="text-align:center;">${c.maxDaysPastDue}</td>
                <td style="text-align:center;">${c.tier}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot style="background-color: #f3f4f6; font-weight: bold;">
            <tr>
              <td colspan="2">Total</td>
              <td style="text-align:right;">₹${filteredCustomers.reduce((sum, c) => sum + c.totalOutstanding, 0).toLocaleString()}</td>
              <td style="text-align:center;">${filteredCustomers.reduce((sum, c) => sum + c.invoiceCount, 0)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      tableHTML = `
        <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse;">
          <thead style="background-color: #f3f4f6;">
            <tr>
              <th>Invoice No</th>
              <th>Customer</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Balance</th>
              <th>Overdue</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices.map(inv => `
              <tr>
                <td>${inv.invoiceNo}</td>
                <td>${inv.customerName}</td>
                <td>${formatDate(inv.dueDate)}</td>
                <td style="text-align:right;">₹${inv.totalAmount.toLocaleString()}</td>
                <td style="text-align:right; color: red;">₹${inv.balance.toLocaleString()}</td>
                <td style="text-align:center;">${inv.daysPastDue}d</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot style="background-color: #f3f4f6; font-weight: bold;">
            <tr>
              <td colspan="3">Total</td>
              <td style="text-align:right;">₹${filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</td>
              <td style="text-align:right; color: red;">₹${filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0).toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${currentCompany}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1f2937; margin-bottom: 5px; }
            .meta { color: #6b7280; margin-bottom: 20px; }
            table { font-size: 12px; }
            th, td { padding: 8px; text-align: left; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">${currentCompany} | Generated on ${date}</div>
          ${tableHTML}
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("PDF ready for print");
  };

  const getDaysOverdueBadge = (days: number) => {
    if (days <= 0) return <Badge variant="outline">Due Today</Badge>;
    if (days <= 7) return <Badge className="bg-yellow-500/20 text-yellow-600">{days}d overdue</Badge>;
    if (days <= 15) return <Badge className="bg-orange-500/20 text-orange-600">{days}d overdue</Badge>;
    if (days <= 30) return <Badge className="bg-red-500/20 text-red-600">{days}d overdue</Badge>;
    return <Badge variant="destructive">{days}d overdue</Badge>;
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "A":
        return <Badge className="bg-green-500/20 text-green-600">Tier A</Badge>;
      case "B":
        return <Badge className="bg-blue-500/20 text-blue-600">Tier B</Badge>;
      default:
        return <Badge variant="outline">Tier C</Badge>;
    }
  };

  // Filter logic
  const filteredCustomers = overdueCustomers.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchesFilter = filterDays === null || c.maxDaysPastDue >= filterDays;
    return matchesSearch && matchesFilter;
  });

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterDays === null || inv.daysPastDue >= filterDays;
    return matchesSearch && matchesFilter;
  });

  const exportRows = useMemo(() => {
    if (activeTab === "customers") {
      return filteredCustomers.map((c) => ({
        customerName: c.customerName,
        phone: c.phone || "",
        outstandingAmount: Number(c.totalOutstanding.toFixed(2)),
        invoiceCount: c.invoiceCount,
        daysOverdue: c.maxDaysPastDue,
        tier: c.tier,
        blocked: c.isBlocked ? "Yes" : "No",
      }));
    }
    return filteredInvoices.map((inv) => ({
      invoiceNo: inv.invoiceNo,
      customer: inv.customerName,
      phone: inv.customerPhone || "",
      invoiceDate: formatDate(inv.date),
      dueDate: formatDate(inv.dueDate),
      totalAmount: Number(inv.totalAmount.toFixed(2)),
      paidAmount: Number(inv.paidAmount.toFixed(2)),
      balanceDue: Number(inv.balance.toFixed(2)),
      daysOverdue: inv.daysPastDue,
    }));
  }, [activeTab, filteredCustomers, filteredInvoices]);

  // Handle Payment Recording
  const handleRecordPayment = (customer: OverdueCustomer) => {
    setSelectedCustomer(customer);
    setPaymentData({
      amount: customer.totalOutstanding.toString(),
      mode: "CASH",
      reference: "",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedCustomer || !paymentData.amount) return;

    setIsSaving(true);
    try {
      const res = await recordPayment({
        companyName: currentCompany,
        customerId: selectedCustomer.customerId,
        amount: parseFloat(paymentData.amount),
        mode: paymentData.mode,
        reference: paymentData.reference || undefined,
        notes: paymentData.notes || undefined,
      });

      if (res.success) {
        setShowPaymentModal(false);
        loadData();
      } else {
        alert("Failed to record payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to record payment");
    }
    setIsSaving(false);
  };

  // Handle Reminder
  const handleSendReminder = async (invoice: InvoiceForReminder) => {
    setSelectedInvoice(invoice);
    setReminderPhone(invoice.customerPhone || "");
    setIsSendingReminder(true);

    try {
      const templateType = invoice.daysPastDue > 30
        ? "FINAL_NOTICE"
        : invoice.daysPastDue > 15
        ? "SECOND_REMINDER"
        : invoice.daysPastDue > 0
        ? "FIRST_REMINDER"
        : "PAYMENT_DUE";

      const res = await generateReminderMessage(invoice.id, templateType);
      if (res.success && res.message) {
        setReminderMessage(res.message);
        setShowReminderModal(true);
      } else {
        alert("Failed to generate reminder message");
      }
    } catch (error) {
      console.error("Reminder error:", error);
      alert("Failed to generate reminder");
    }
    setIsSendingReminder(false);
  };

  const handleConfirmReminder = async () => {
    if (!selectedInvoice || !reminderMessage) return;

    // Log the reminder
    await logReminder({
      companyName: currentCompany,
      customerId: selectedInvoice.customerId,
      invoiceId: selectedInvoice.id,
      dueAmount: selectedInvoice.balance,
      dueDate: selectedInvoice.dueDate,
      daysPastDue: selectedInvoice.daysPastDue,
      messageText: reminderMessage,
      channel: "WHATSAPP",
      phoneNumber: reminderPhone,
      reminderType: selectedInvoice.daysPastDue > 30 ? "FINAL" : selectedInvoice.daysPastDue > 15 ? "THIRD" : selectedInvoice.daysPastDue > 7 ? "SECOND" : "FIRST",
    });

    // Open WhatsApp
    shareReminderMessageViaWhatsApp(reminderMessage, reminderPhone);
    setShowReminderModal(false);
  };

  return (
    <PageShell
      title="Collections"
      description="Track outstanding payments and manage collections"
      icon={<IndianRupee className="h-6 w-6" />}
    >
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                formatCurrency(metrics.totalOutstanding)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingInvoiceCount} pending invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                formatCurrency(metrics.overdueAmount)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.overdueInvoiceCount} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected (30 days)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                formatCurrency(metrics.collectionsLast30Days)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Customers</CardTitle>
            <Ban className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.blockedCustomersCount}
            </div>
            <p className="text-xs text-muted-foreground">Credit blocked</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer or invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterDays === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterDays(null)}
              >
                All
              </Button>
              <Button
                variant={filterDays === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterDays(1)}
              >
                Overdue
              </Button>
              <Button
                variant={filterDays === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterDays(7)}
              >
                7+ days
              </Button>
              <Button
                variant={filterDays === 15 ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterDays(15)}
              >
                15+ days
              </Button>
              <Button
                variant={filterDays === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterDays(30)}
              >
                30+ days
              </Button>
            </div>
            
            {/* Export & Refresh Buttons */}
            <div className="flex gap-2">
              <ExportButton
                data={exportRows}
                filename={`collections-${activeTab}-${new Date().toISOString().split("T")[0]}`}
                title={activeTab === "customers" ? "Outstanding by Customer" : "Pending Invoices"}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={loadData}
                disabled={isLoading}
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 border-b">
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "customers"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("customers")}
            >
              <Users className="h-4 w-4 inline mr-2" />
              By Customer ({filteredCustomers.length})
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "invoices"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("invoices")}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              By Invoice ({filteredInvoices.length})
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("history")}
            >
              <History className="h-4 w-4 inline mr-2" />
              Transaction History
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Customer-wise Outstanding */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : filteredCustomers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No overdue payments found!</p>
              </CardContent>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.customerId} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/dashboard/customers/${customer.customerId}`}
                          className="font-semibold text-lg hover:underline"
                        >
                          {customer.customerName}
                        </Link>
                        {customer.isBlocked && (
                          <Badge variant="destructive">Blocked</Badge>
                        )}
                        {getTierBadge(customer.tier)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {customer.invoiceCount} invoice(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Oldest due: {formatDate(customer.oldestDueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-bold text-red-600">
                          {formatCurrency(customer.totalOutstanding)}
                        </div>
                        {getDaysOverdueBadge(customer.maxDaysPastDue)}
                      </div>

                      <div className="flex gap-2">
                        {customer.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const invoice = invoices.find(
                                (i) => i.customerId === customer.customerId
                              );
                              if (invoice) handleSendReminder(invoice);
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" onClick={() => handleRecordPayment(customer)}>
                          <CreditCard className="h-4 w-4 mr-1" />
                          Record
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Invoice-wise Outstanding */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No pending invoices found!</p>
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{invoice.invoiceNo}</span>
                        {getDaysOverdueBadge(invoice.daysPastDue)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <Link
                          href={`/dashboard/customers/${invoice.customerId}`}
                          className="hover:underline"
                        >
                          {invoice.customerName}
                        </Link>
                        {invoice.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {invoice.customerPhone}
                          </span>
                        )}
                        <span>Invoice Date: {formatDate(invoice.date)}</span>
                        <span>Due: {formatDate(invoice.dueDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Total: {formatCurrency(invoice.totalAmount)}
                        </div>
                        <div className="text-xl font-bold text-red-600">
                          Due: {formatCurrency(invoice.balance)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {invoice.customerPhone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendReminder(invoice)}
                            disabled={isSendingReminder}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Remind
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Transaction History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                All invoices and payments from your customers
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading transactions...
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Show all invoices as transactions */}
                  {invoices
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 50)
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            inv.balance === 0
                              ? "bg-green-100 text-green-600"
                              : inv.daysPastDue > 0
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">{inv.invoiceNo}</div>
                            <div className="text-sm text-muted-foreground">
                              {inv.customerName} • {formatDate(inv.date)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatCurrency(inv.totalAmount)}
                          </div>
                          <div className={`text-xs ${
                            inv.balance === 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}>
                            {inv.balance === 0 ? "Paid" : `Due: ${formatCurrency(inv.balance)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedCustomer.customerName}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Amount</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, amount: e.target.value })
                    }
                    className="pl-10"
                    placeholder="Enter amount"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Outstanding: {formatCurrency(selectedCustomer.totalOutstanding)}
                </p>
              </div>

              <div>
                <Label>Payment Mode</Label>
                <select
                  className="w-full border rounded-md p-2 bg-background"
                  value={paymentData.mode}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      mode: e.target.value as RecordPaymentData["mode"],
                    })
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                </select>
              </div>

              <div>
                <Label>Reference (Optional)</Label>
                <Input
                  value={paymentData.reference}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, reference: e.target.value })
                  }
                  placeholder="Transaction ID / Cheque No"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={paymentData.notes}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, notes: e.target.value })
                  }
                  placeholder="Any notes"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSavePayment}
                  disabled={isSaving || !paymentData.amount}
                >
                  {isSaving ? "Saving..." : "Record Payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Send WhatsApp Reminder
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedInvoice.customerName} - {selectedInvoice.invoiceNo}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={reminderPhone}
                  onChange={(e) => setReminderPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <Label>Message Preview</Label>
                <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {reminderMessage}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowReminderModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmReminder}
                  disabled={!reminderPhone}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
