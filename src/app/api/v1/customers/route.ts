
import { NextResponse } from "next/server";
import { getCustomersAction } from "@/actions/customer";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const company = searchParams.get("companyName") || "Sai Associates";

        const result = await getCustomersAction(company);

        if (result.success) {
            return NextResponse.json(result.customers, { status: 200 });
        } else {
            return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
        }

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
