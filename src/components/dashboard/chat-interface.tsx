"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Bot, Send, Loader2, Sparkles, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";
import { useRouter } from "next/navigation";
import { processQuery, AiResponse } from "@/actions/ai";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'table' | 'metric' | 'action' | 'chart' | 'insight';
    data?: any;
    navigationPath?: string;
    suggestions?: string[];
}

interface ChatInterfaceProps {
    className?: string;
    initialMessages?: Message[];
    showHeader?: boolean;
    onClose?: () => void;
    title?: string;
    subtitle?: string;
}

export interface ChatInterfaceRef {
    sendMessage: (query: string) => void;
}

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({
    className,
    initialMessages,
    showHeader = false,
    onClose,
    title = "Smart Assistant",
    subtitle = "Voice & Automation Active"
}, ref) => {
    const { currentCompany } = useCompany();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [messages, setMessages] = useState<Message[]>(initialMessages || [
        { role: 'assistant', content: "Hi! I'm your SmartVyapar assistant. Ask me about sales, inventory, or say 'Go to...' to navigate." }
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        sendMessage: (text: string) => {
            handleSend(text);
        }
    }));

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const startListening = () => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsListening(true);

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setQuery(transcript);
                setIsListening(false);
                handleSend(transcript);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech error", event.error);
                setIsListening(false);
            };

            recognition.onend = () => setIsListening(false);

            recognition.start();
        } else {
            alert("Voice input is not supported in this browser.");
        }
    };

    const handleSend = async (manualQuery?: string) => {
        const userMsg = manualQuery || query;
        if (!userMsg.trim()) return;

        setQuery("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const response: AiResponse = await processQuery(userMsg, currentCompany);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.text,
                type: response.type,
                data: response.data,
                navigationPath: response.navigationPath,
                suggestions: response.suggestions
            }]);

            if (response.intent === 'NAVIGATE' && response.navigationPath) {
                setTimeout(() => {
                    router.push(response.navigationPath!);
                }, 1500);
            }

            if (response.intent === 'ACTION') {
                if (response.actionType === 'CREATE_INVOICE') {
                    setTimeout(() => router.push('/dashboard/pos'), 1500);
                }
                if (response.actionType === 'CREATE_TRIP') {
                    setTimeout(() => router.push('/dashboard/trips?action=new'), 1500);
                }
                if (response.actionType === 'ADD_CUSTOMER') {
                    setTimeout(() => router.push('/dashboard/customers?action=new'), 1500);
                }
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn("flex flex-col h-full bg-background overflow-hidden", className)}>
            {/* Optional Header */}
            {showHeader && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">{title}</h3>
                            <p className="text-[10px] text-blue-100 opacity-80">{subtitle}</p>
                        </div>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={onClose}>
                            <span className="h-5 w-5 text-lg leading-none">×</span>
                        </Button>
                    )}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30" ref={scrollRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                            msg.role === 'user'
                                ? "bg-blue-600 text-white rounded-br-none"
                                : "bg-card text-card-foreground border border-border rounded-bl-none"
                        )}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>

                            {/* Render Data: Metrics */}
                            {msg.type === 'metric' && msg.data && (
                                <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <div className="flex justify-between items-center text-foreground">
                                        <span className="text-xs font-semibold uppercase">Total</span>
                                        <span className="text-lg font-bold">₹{msg.data.total?.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Render Data: Table/List */}
                            {msg.type === 'table' && msg.data && Array.isArray(msg.data) && (
                                <div className="mt-2 text-xs space-y-1">
                                    {msg.data.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between p-2 bg-muted/40 rounded border border-border">
                                            <span className="font-medium truncate max-w-[150px]">{item.name}</span>
                                            <span className="font-mono text-muted-foreground">
                                                {item.stock !== undefined ? `${item.stock} qty` : `₹${item.balance?.toLocaleString()}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Render Automation Feedback */}
                            {msg.type === 'action' && (
                                <div className="mt-2 text-xs flex items-center text-green-600 font-medium">
                                    <Sparkles className="h-3 w-3 mr-1" /> Auto-navigating...
                                </div>
                            )}

                            {/* Render Insights with better styling */}
                            {msg.type === 'insight' && msg.data && (
                                <div className="mt-3 p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                                    {msg.data.healthScore !== undefined && (
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-foreground">Health Score</span>
                                            <span className={`text-lg font-bold ${msg.data.healthScore >= 80 ? 'text-green-600' : msg.data.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {msg.data.healthScore}/100
                                            </span>
                                        </div>
                                    )}
                                    {msg.data.growth !== undefined && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className={`font-bold ${Number(msg.data.growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {Number(msg.data.growth) >= 0 ? '↑' : '↓'} {msg.data.growth}%
                                            </span>
                                            <span className="text-muted-foreground">growth</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Render Suggestions */}
                            {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Related queries:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {msg.suggestions.map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSend(suggestion)}
                                                className="text-[10px] px-2 py-1 bg-muted hover:bg-primary/15 hover:text-primary rounded-full transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-card rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-border flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-xs text-muted-foreground">Processing...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border shrink-0">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                >
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={startListening}
                        className={cn("rounded-full transition-all border-border", isListening ? "bg-red-100 text-red-600 border-red-200 animate-pulse" : "")}
                    >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>

                    <input
                        className="flex-1 bg-muted border border-border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder={isListening ? "Listening..." : "Ask or say 'Go to...'"}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !query.trim()} className="rounded-full bg-blue-600 hover:bg-blue-700 h-10 w-10">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                    Tip: Try "How are sales today?" or "Go to inventory"
                </p>
            </div>
        </div>
    );
});
ChatInterface.displayName = "ChatInterface";
