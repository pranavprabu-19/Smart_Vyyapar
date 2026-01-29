"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Loader2, Sparkles, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";
import { useRouter } from "next/navigation";
import { ChatInterface } from "./chat-interface";

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Trigger Button */}
            <div className="fixed bottom-6 right-6 z-50">
                {!isOpen && (
                    <Button
                        onClick={() => setIsOpen(true)}
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:scale-110"
                    >
                        <Sparkles className="h-7 w-7 text-white animate-pulse" />
                    </Button>
                )}
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[350px] md:w-[400px] animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <Card className="shadow-2xl border-0 overflow-hidden h-[500px]">
                        <ChatInterface
                            showHeader
                            onClose={() => setIsOpen(false)}
                        />
                    </Card>
                </div>
            )}
        </>
    );
}
