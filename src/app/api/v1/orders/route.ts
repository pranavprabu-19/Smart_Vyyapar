
import { NextResponse } from "next/server";
import { createInvoiceAction } from "@/actions/invoice";
import { InvoiceData } from "@/lib/invoice-utils";

export async function POST(request: Request) {
    try {
        const body: InvoiceData = await request.json();

        // Basic Validation
        if (!body.items || body.items.length === 0 || !body.customer) {
            return NextResponse.json({ error: "Invalid Order Data" }, { status: 400 });
        }

        const result = await createInvoiceAction(body);

        if (result.success) {
            return NextResponse.json({ id: result.id, message: "Order placed successfully" }, { status: 201 });
        } else {
            return NextResponse.json({ error: result.error || "Failed to place order" }, { status: 500 });
        }

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
