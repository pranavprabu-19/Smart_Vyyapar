
import { NextResponse } from "next/server";
import { getProductsAction } from "@/actions/inventory";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const company = searchParams.get("companyName") || "Sai Associates";

        const result = await getProductsAction(company);

        if (result.success) {
            return NextResponse.json(result.products, { status: 200 });
        } else {
            return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
        }

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
