"use client";

import { InvoiceGenerator } from "@/components/features/invoice-generator";

export default function InvoicePage() {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">New Invoice</h2>
            <InvoiceGenerator />
        </div>
    );
}
