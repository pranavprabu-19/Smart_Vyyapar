
import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/actions/dashboard";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const company = searchParams.get("companyName") || "Sai Associates";

        const metrics = await getDashboardMetrics(company);

        return NextResponse.json(metrics, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch dashboard metrics" }, { status: 500 });
    }
}
