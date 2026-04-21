import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { runCreditLimitAutomationJob } from "@/actions/customer-prediction";

function cronSecretFromEnv(): string | undefined {
    return (
        process.env.ML_CRON_SECRET?.trim() ||
        process.env.CRON_SECRET?.trim()
    );
}

async function handleApplyRiskActions(request: NextRequest) {
    const cronSecret = cronSecretFromEnv();
    const headerSecret = request.headers.get("x-cron-secret");
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const cronOk = Boolean(
        cronSecret && (headerSecret === cronSecret || bearer === cronSecret)
    );

    const session = await getServerSession();
    if (!cronOk && !session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get("companyName") || session?.companyName || null;
    if (!companyName) {
        return NextResponse.json(
            { error: "companyName required (query parameter or session)" },
            { status: 400 }
        );
    }

    const result = await runCreditLimitAutomationJob(companyName);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

/**
 * Runs credit-limit automation for a company (same job as `runCreditLimitAutomationJob`).
 * Auth: logged-in session, or shared secret via `Authorization: Bearer <secret>` or `x-cron-secret`
 * (`ML_CRON_SECRET` or Vercel `CRON_SECRET`).
 * Query: `companyName` (required when using cron if no session company on token).
 * GET is supported so Vercel Cron (GET) can trigger this route.
 */
export async function GET(request: NextRequest) {
    return handleApplyRiskActions(request);
}

export async function POST(request: NextRequest) {
    return handleApplyRiskActions(request);
}
