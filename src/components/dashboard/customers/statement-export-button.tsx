"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCustomerStatementAction } from "@/actions/customer";

type StatementPayload = {
    customer: {
        id: string;
        name: string;
        phone: string | null;
        email: string | null;
        companyName: string;
    };
    totals: {
        invoiceTotal: number;
        paymentTotal: number;
        openingBalance?: number;
        outstanding: number;
    };
    entries: Array<{
        date: string;
        type: "INVOICE" | "PAYMENT";
        refNo: string;
        description: string;
        debit: number;
        credit: number;
        runningBalance: number;
    }>;
};

export function StatementExportButton({
    customerId,
    companyName,
    compact = false,
}: {
    customerId: string;
    companyName?: string;
    compact?: boolean;
}) {
    const [loading, setLoading] = useState(false);

    const downloadCsv = (csv: string, filename: string) => {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadPdf = (payload: StatementPayload, filename: string) => {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text(`Customer Statement - ${payload.customer.name}`, 14, 18);
        doc.setFontSize(10);
        doc.text(`Company: ${payload.customer.companyName}`, 14, 25);
        doc.text(`Opening: Rs ${(payload.totals.openingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 31);
        doc.text(`Closing (Outstanding): Rs ${payload.totals.outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 37);

        autoTable(doc, {
            startY: 42,
            head: [["Date", "Type", "Ref", "Description", "Debit", "Credit", "Balance"]],
            body: payload.entries.map((e) => [
                e.date,
                e.type,
                e.refNo,
                e.description,
                e.debit.toFixed(2),
                e.credit.toFixed(2),
                e.runningBalance.toFixed(2),
            ]),
            styles: { fontSize: 8 },
        });
        doc.save(filename);
    };

    const runExport = async (format: "csv" | "pdf") => {
        setLoading(true);
        try {
            const res = await getCustomerStatementAction({ customerId, companyName });
            if (!res.success || !res.statement || !res.fileNameBase) {
                throw new Error(res.error || "Failed to generate statement");
            }

            if (format === "csv") {
                downloadCsv(res.csv || "", `${res.fileNameBase}.csv`);
                toast.success("Statement CSV downloaded");
            } else {
                downloadPdf(res.statement, `${res.fileNameBase}.pdf`);
                toast.success("Statement PDF downloaded");
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to export statement");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className={compact ? "h-7 text-xs gap-1" : undefined}
                onClick={() => runExport("csv")}
                disabled={loading}
            >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                {compact ? "Stmt CSV" : "Statement CSV"}
            </Button>
            <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className={compact ? "h-7 text-xs gap-1" : undefined}
                onClick={() => runExport("pdf")}
                disabled={loading}
            >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                {compact ? "Stmt PDF" : "Statement PDF"}
            </Button>
        </div>
    );
}

