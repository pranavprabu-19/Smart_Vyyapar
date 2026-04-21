"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runMLAutomationCycle } from "@/actions/ml-automation";

interface AutomationRunnerProps {
    companyName: string;
}

export function AutomationRunner({ companyName }: AutomationRunnerProps) {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<string>("");
    const router = useRouter();

    const onRun = () => {
        setMessage("");
        startTransition(async () => {
            try {
                const result = await runMLAutomationCycle(companyName);
                if (!result.success) {
                    setMessage("Automation completed with partial failures. Check logs.");
                } else {
                    setMessage(
                        `Done: ${result.creditAutomation.reduced} credit updates, ${result.liquidationAutomation.flagged} liquidation flags.`
                    );
                }
                router.refresh();
            } catch {
                setMessage("Failed to run automation cycle.");
            }
        });
    };

    return (
        <div className="flex flex-col items-end gap-2">
            <Button onClick={onRun} disabled={isPending} className="min-w-[220px]">
                {isPending ? "Running ML Automation..." : "Run ML Automation Now"}
            </Button>
            {message ? (
                <p className="text-xs text-muted-foreground max-w-[320px] text-right">{message}</p>
            ) : null}
        </div>
    );
}
