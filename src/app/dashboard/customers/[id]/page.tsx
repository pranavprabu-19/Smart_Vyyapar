
import { getCustomerDetails } from "@/actions/customer";
import { AddPaymentDialog } from "@/components/dashboard/customers/add-payment-dialog";
import { StatementExportButton } from "@/components/dashboard/customers/statement-export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Phone, Mail, MapPin, ReceiptIndianRupee, History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Fetch Real Data
    const result = await getCustomerDetails(id);

    if (!result.success || !result.customer) {
        notFound();
    }

    const { customer } = result;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{customer.name}</h2>
                    <div className="flex items-center text-muted-foreground mt-1 gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{customer.address}, {customer.state}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <AddPaymentDialog customerId={customer.id} customerName={customer.name} />
                    <StatementExportButton customerId={customer.id} companyName={customer.companyName} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Contact Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Contact Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {customer.phone && (
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.phone}</span>
                            </div>
                        )}
                        {customer.email && (
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.email}</span>
                            </div>
                        )}
                        {customer.gstin && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-semibold text-xs border rounded px-1 min-w-[3rem] text-center">GSTIN</span>
                                <span>{customer.gstin}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Financials */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Financial Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Total Outstanding</div>
                            <div className="text-2xl font-bold text-red-600">₹{customer.balance.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Total Revenue</div>
                            <div className="text-xl font-bold">₹{customer.totalRevenue.toLocaleString()}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Map Snapshot (Mock/Placeholder or real if lat/lng) */}
                <Card className="overflow-hidden">
                    <div className="h-full w-full bg-muted flex items-center justify-center min-h-[150px]">
                        {customer.lat && customer.lng ? (
                            <div className="text-center">
                                <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                                <a
                                    href={`https://maps.google.com/?q=${customer.lat},${customer.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 underline"
                                >
                                    View on Map
                                </a>
                            </div>
                        ) : (
                            <span className="text-muted-foreground text-sm">No Location Data</span>
                        )}
                    </div>
                </Card>
            </div>

            {/* Order History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Order History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {customer.invoices && customer.invoices.length > 0 ? (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm text-left">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Invoice No</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Amount</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {customer.invoices.map((inv) => (
                                        <tr key={inv.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle">{new Date(inv.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                            <td className="p-4 align-middle font-medium">{inv.invoiceNo}</td>
                                            <td className="p-4 align-middle">₹{inv.totalAmount.toLocaleString()}</td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <Link
                                                    href={`/dashboard/invoices/${inv.id}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-muted-foreground">No orders found.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
