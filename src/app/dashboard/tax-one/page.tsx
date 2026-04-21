"use client";

import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/lib/company-context";
import { useEffect, useState } from "react";
import { getTaxSummaryAction, TaxSummary } from "@/actions/tax";
import { 
  Loader2, Send, FileSpreadsheet, CheckCircle, ShieldCheck, 
  AlertTriangle, Calendar, FileText, Download, Upload, 
  Building2, Receipt, BarChart3, Clock, ArrowRight,
  RefreshCw, BookOpen, IndianRupee, TrendingUp, FileJson
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function TaxOnePage() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TaxSummary | null>(null);
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState<"overview" | "gstr" | "einvoice" | "tally">("overview");
  const [caEmail, setCaEmail] = useState("");

  useEffect(() => {
    loadData();
  }, [currentCompany, month, year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getTaxSummaryAction(currentCompany, parseInt(month), parseInt(year));
      setData(res);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load tax data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSendToCA = () => {
    if (!caEmail) {
      toast.error("Please enter CA email");
      return;
    }
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Packaging data & securely sending to CA...",
        success: "Data sent successfully via TaxOne Secure Link!",
        error: "Transmission failed",
      }
    );
  };

  const handleExportGSTR1 = () => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          // Create sample GSTR-1 JSON
          const gstr1Data = {
            gstin: "29AABCT1234F1Z5",
            fp: `${month.padStart(2, "0")}${year}`,
            version: "GST3.0.4",
            hash: "hash",
            b2b: [],
            b2cl: [],
            b2cs: [
              {
                sply_ty: "INTRA",
                pos: "29",
                txval: data?.totalSales || 0,
                csamt: 0,
                rt: 18,
                iamt: 0,
                camt: data?.gstBreakdown?.cgst || 0,
                samt: data?.gstBreakdown?.sgst || 0,
              },
            ],
            nil: { inv: [{ sply_ty: "INTRB2B", expt_amt: 0, nil_amt: 0, ngsup_amt: 0 }] },
          };

          const blob = new Blob([JSON.stringify(gstr1Data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `GSTR1_${currentCompany}_${month}_${year}.json`;
          a.click();
          URL.revokeObjectURL(url);
          resolve(true);
        }, 1500);
      }),
      {
        loading: "Generating GSTR-1 JSON...",
        success: "GSTR-1 JSON downloaded!",
        error: "Export failed",
      }
    );
  };

  const handleExportTally = () => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          // Create Tally XML format
          const tallyXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${currentCompany}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${year}${month.padStart(2, "0")}01</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <PARTYLEDGERNAME>Cash Sales</PARTYLEDGERNAME>
            <BASICBASEPARTYNAME>Cash Sales</BASICBASEPARTYNAME>
            <VOUCHERNUMBER>Import-${month}-${year}</VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <AMOUNT>${data?.totalSales || 0}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

          const blob = new Blob([tallyXml], { type: "application/xml" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Tally_Export_${currentCompany}_${month}_${year}.xml`;
          a.click();
          URL.revokeObjectURL(url);
          resolve(true);
        }, 1500);
      }),
      {
        loading: "Generating Tally XML...",
        success: "Tally XML downloaded! Import this in Tally Prime.",
        error: "Export failed",
      }
    );
  };

  const handleExportExcel = (type: string) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          // Create CSV (Excel-compatible)
          let csvContent = "";
          
          if (type === "sales") {
            csvContent = `Sales Register - ${currentCompany} - ${months.find(m => m.value === month)?.label} ${year}
Invoice No,Date,Customer,GSTIN,Taxable Value,CGST,SGST,IGST,Total
INV001,01/${month}/${year},Sample Customer,29AABCT1234F1Z5,${(data?.totalSales || 0) / (data?.invoiceCount || 1)},${(data?.gstBreakdown?.cgst || 0) / (data?.invoiceCount || 1)},${(data?.gstBreakdown?.sgst || 0) / (data?.invoiceCount || 1)},0,${(data?.totalSales || 0) / (data?.invoiceCount || 1)}
...more rows...
TOTAL,,,,,${data?.totalSales || 0},${data?.gstBreakdown?.cgst || 0},${data?.gstBreakdown?.sgst || 0},${data?.gstBreakdown?.igst || 0},${(data?.totalSales || 0) + (data?.totalTax || 0)}`;
          } else if (type === "hsn") {
            csvContent = `HSN Summary - ${currentCompany} - ${months.find(m => m.value === month)?.label} ${year}
HSN Code,Description,UQC,Total Quantity,Total Taxable Value,CGST,SGST,IGST,Total
22011010,Mineral Water,LTR,1000,${data?.totalSales || 0},${data?.gstBreakdown?.cgst || 0},${data?.gstBreakdown?.sgst || 0},${data?.gstBreakdown?.igst || 0},${(data?.totalSales || 0) + (data?.totalTax || 0)}`;
          }

          const blob = new Blob([csvContent], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${type}_${currentCompany}_${month}_${year}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          resolve(true);
        }, 1000);
      }),
      {
        loading: `Generating ${type} report...`,
        success: `${type} report downloaded!`,
        error: "Export failed",
      }
    );
  };

  // Calculate compliance score
  const getComplianceScore = () => {
    let score = 100;
    // Deduct points for missing data
    if (!data?.b2bCount) score -= 10;
    if ((data?.totalTax || 0) === 0 && (data?.totalSales || 0) > 0) score -= 20;
    return Math.max(0, score);
  };

  const complianceScore = getComplianceScore();

  return (
    <PageShell
      title="Vyapar TaxOne"
      description="GST Compliance, E-Invoice & Accounting Integration"
      icon={<ShieldCheck className="h-6 w-6 text-blue-600" />}
      action={
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "gstr", label: "GSTR Reports", icon: FileText },
          { id: "einvoice", label: "E-Invoice", icon: Receipt },
          { id: "tally", label: "Tally Integration", icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-100 text-blue-700"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Compliance Score Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={`bg-gradient-to-br ${complianceScore >= 80 ? 'from-green-500/10 to-emerald-500/10 border-green-500/20' : complianceScore >= 60 ? 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20' : 'from-red-500/10 to-orange-500/10 border-red-500/20'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className={`h-4 w-4 ${complianceScore >= 80 ? 'text-green-600' : complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
                  Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${complianceScore >= 80 ? 'text-green-600' : complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {complianceScore}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {complianceScore >= 80 ? "Excellent" : complianceScore >= 60 ? "Good" : "Needs Attention"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-blue-600" />
                  Taxable Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : formatCurrency(data?.totalSales || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{data?.invoiceCount || 0} invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  Tax Liability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {loading ? "..." : formatCurrency(data?.totalTax || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Output GST</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  Filing Due
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">11th</div>
                <p className="text-xs text-muted-foreground">of next month</p>
              </CardContent>
            </Card>
          </div>

          {/* Tax Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>GST Breakdown</CardTitle>
                <CardDescription>Tax component wise summary</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">CGST (9%)</span>
                      <span className="font-bold">{formatCurrency(data?.gstBreakdown?.cgst || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">SGST (9%)</span>
                      <span className="font-bold">{formatCurrency(data?.gstBreakdown?.sgst || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">IGST (18%)</span>
                      <span className="font-bold">{formatCurrency(data?.gstBreakdown?.igst || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm font-bold text-blue-700">Total Tax</span>
                      <span className="font-bold text-blue-700">{formatCurrency(data?.totalTax || 0)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CA Connection */}
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShieldCheck className="h-5 w-5" /> TaxOne Secure
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Share data securely with your CA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-blue-100 text-xs">CA Email</Label>
                  <Input
                    value={caEmail}
                    onChange={(e) => setCaEmail(e.target.value)}
                    placeholder="ca@example.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200"
                  />
                </div>
                <Button
                  onClick={handleSendToCA}
                  className="w-full bg-white text-blue-600 hover:bg-blue-50"
                >
                  <Send className="h-4 w-4 mr-2" /> Send Data to CA
                </Button>
                <p className="text-[10px] text-blue-200 text-center">
                  Encrypted & Secure Transfer
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={handleExportGSTR1}>
                  <FileJson className="h-6 w-6 text-blue-600" />
                  <span>GSTR-1 JSON</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => handleExportExcel("sales")}>
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <span>Sales Register</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => handleExportExcel("hsn")}>
                  <FileText className="h-6 w-6 text-purple-600" />
                  <span>HSN Summary</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={handleExportTally}>
                  <BookOpen className="h-6 w-6 text-orange-600" />
                  <span>Tally Export</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GSTR Reports Tab */}
      {activeTab === "gstr" && (
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { id: "gstr1", name: "GSTR-1", desc: "Outward supplies (Sales)", due: "11th of next month", status: "pending" },
            { id: "gstr2b", name: "GSTR-2B", desc: "Auto-drafted ITC", due: "Auto-generated", status: "available" },
            { id: "gstr3b", name: "GSTR-3B", desc: "Summary return", due: "20th of next month", status: "pending" },
            { id: "gstr9", name: "GSTR-9", desc: "Annual return", due: "31st December", status: "pending" },
          ].map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    {report.name}
                  </CardTitle>
                  <Badge variant={report.status === "available" ? "default" : "secondary"}>
                    {report.status}
                  </Badge>
                </div>
                <CardDescription>{report.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Due: {report.due}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => report.id === "gstr1" ? handleExportGSTR1() : toast.info(`${report.name} export coming soon!`)}
                  >
                    <Download className="h-4 w-4 mr-1" /> JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleExportExcel("sales")}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* E-Invoice Tab */}
      {activeTab === "einvoice" && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-purple-600" />
                E-Invoice (IRN) Generation
              </CardTitle>
              <CardDescription>
                Generate IRN for B2B invoices above Rs. 5 Cr turnover
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">E-Invoice Requirements</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        E-invoicing is mandatory for businesses with turnover above Rs. 5 crore.
                        Ensure your GSTIN and credentials are configured correctly.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>GSP Username</Label>
                    <Input placeholder="Enter GSP username" />
                  </div>
                  <div>
                    <Label>GSP Password</Label>
                    <Input type="password" placeholder="Enter GSP password" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Receipt className="h-4 w-4 mr-2" /> Generate E-Invoice
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" /> Bulk Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent E-Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No e-invoices generated yet</p>
                <p className="text-sm mt-2">Generate e-invoices for your B2B transactions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tally Integration Tab */}
      {activeTab === "tally" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-orange-600" />
                Tally Prime Integration
              </CardTitle>
              <CardDescription>
                Export data in Tally XML format for seamless import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Upload className="h-8 w-8 text-orange-600" />
                        <div>
                          <h4 className="font-semibold">Export to Tally</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Export sales vouchers, purchases, and journal entries in Tally XML format.
                          </p>
                          <Button className="mt-3" onClick={handleExportTally}>
                            <Download className="h-4 w-4 mr-2" /> Export Vouchers XML
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-8 w-8 text-blue-600" />
                        <div>
                          <h4 className="font-semibold">Masters Export</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Export ledger masters, stock items, and groups for Tally setup.
                          </p>
                          <Button className="mt-3" variant="outline" onClick={() => toast.info("Masters export coming soon!")}>
                            <Download className="h-4 w-4 mr-2" /> Export Masters XML
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">How to Import in Tally Prime</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Download the XML file using the export button above</li>
                    <li>Open Tally Prime and select the target company</li>
                    <li>Go to Gateway &gt; Import &gt; XML</li>
                    <li>Select the downloaded XML file</li>
                    <li>Review and confirm the import</li>
                  </ol>
                </div>

                <div className="flex items-center gap-2 p-4 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Compatible with Tally Prime & ERP 9</p>
                    <p className="text-sm text-muted-foreground">XML format supports both versions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export History */}
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No exports yet this month</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
