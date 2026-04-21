"use server";

import { runCreditLimitAutomationJob } from "@/actions/customer-prediction";
import { refreshLiquidationCandidates } from "@/actions/stock-prediction";

export async function runMLAutomationCycle(companyName: string) {
    const [creditAutomation, liquidationAutomation] = await Promise.all([
        runCreditLimitAutomationJob(companyName),
        refreshLiquidationCandidates(companyName),
    ]);

    return {
        success: creditAutomation.success && liquidationAutomation.success,
        creditAutomation,
        liquidationAutomation,
        runAt: new Date().toISOString(),
    };
}
