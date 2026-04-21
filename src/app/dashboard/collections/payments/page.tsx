"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  History,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { prisma } from "@/lib/db";
import Link from "next/link";

type Payment = {
  id: string;
  paymentNo: string;
  customerId: string;
  customerName: string;
  invoiceNo?: string;
  amount: number;
  mode: string;
  reference?: string;
  status: string;
  collectedAt: Date;
  notes?: string;
};

export default function PaymentsHistoryPage() {
  const { currentCompany } = useCompany();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, this would be a server action
    // For now, showing the UI structure
    setIsLoading(false);
    setPayments([]);
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
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CLEARED":
        return (
          <Badge className="bg-green-500/20 text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Cleared
          </Badge>
        );
      case "RECEIVED":
        return (
          <Badge className="bg-blue-500/20 text-blue-600">
            <Clock className="h-3 w-3 mr-1" />
            Received
          </Badge>
        );
      case "DEPOSITED":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Deposited
          </Badge>
        );
      case "BOUNCED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Bounced
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getModeBadge = (mode: string) => {
    const colors: Record<string, string> = {
      CASH: "bg-green-500/20 text-green-600",
      UPI: "bg-purple-500/20 text-purple-600",
      CHEQUE: "bg-orange-500/20 text-orange-600",
      BANK_TRANSFER: "bg-blue-500/20 text-blue-600",
      NEFT: "bg-blue-500/20 text-blue-600",
      RTGS: "bg-blue-500/20 text-blue-600",
    };
    return <Badge className={colors[mode] || ""}>{mode}</Badge>;
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.paymentNo.toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceNo?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <PageShell
      title="Payment History"
      description="View all recorded payments"
      icon={<History className="h-6 w-6" />}
      action={
        <Link href="/dashboard/collections">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Collections
          </Button>
        </Link>
      }
    >
      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, payment no, or invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(null)}
              >
                All
              </Button>
              <Button
                variant={filterStatus === "CLEARED" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("CLEARED")}
              >
                Cleared
              </Button>
              <Button
                variant={filterStatus === "RECEIVED" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("RECEIVED")}
              >
                Received
              </Button>
              <Button
                variant={filterStatus === "BOUNCED" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("BOUNCED")}
              >
                Bounced
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ) : filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments recorded yet</p>
              <p className="text-sm mt-2">
                Payments will appear here when you record them from the Collections page
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{payment.paymentNo}</span>
                      {getStatusBadge(payment.status)}
                      {getModeBadge(payment.mode)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <Link
                        href={`/dashboard/customers/${payment.customerId}`}
                        className="hover:underline"
                      >
                        {payment.customerName}
                      </Link>
                      {payment.invoiceNo && (
                        <span>Invoice: {payment.invoiceNo}</span>
                      )}
                      <span>{formatDate(payment.collectedAt)}</span>
                    </div>
                    {payment.reference && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Ref: {payment.reference}
                      </p>
                    )}
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Note: {payment.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  );
}
