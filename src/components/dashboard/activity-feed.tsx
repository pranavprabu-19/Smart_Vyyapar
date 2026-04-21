"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area" // Assuming ScrollArea exists or we use div
import { FileText, Camera, Truck, User, Clock } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns" // Assuming date-fns is allowed or we use custom formatter

// Simple relative time formatter if date-fns is not available/preferred
function timeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}


type ActivityItem = {
    id: string;
    type: "invoice" | "photo" | "trip" | "customer";
    title: string;
    description?: string;
    timestamp: Date;
    href?: string;
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
    if (!items?.length) return null;

    const getIcon = (type: ActivityItem["type"]) => {
        switch (type) {
            case "invoice": return <FileText className="h-4 w-4" />
            case "photo": return <Camera className="h-4 w-4" />
            case "trip": return <Truck className="h-4 w-4" />
            case "customer": return <User className="h-4 w-4" />
        }
    }

    const getColors = (type: ActivityItem["type"]) => {
        switch (type) {
            case "invoice": return "bg-blue-500/10 text-blue-500"
            case "photo": return "bg-purple-500/10 text-purple-500"
            case "trip": return "bg-orange-500/10 text-orange-500"
            case "customer": return "bg-emerald-500/10 text-emerald-500"
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Live Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[350px] overflow-y-auto">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group"
                        >
                            <div className={`p-2 rounded-full shrink-0 ${getColors(item.type)}`}>
                                {getIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium leading-none truncate">{item.title}</p>
                                    <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                                        {timeAgo(item.timestamp)}
                                    </span>
                                </div>
                                {item.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                        {item.description}
                                    </p>
                                )}
                                {item.href && (
                                    <Link
                                        href={item.href}
                                        className="text-[10px] font-medium text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity block pt-1"
                                    >
                                        View Details →
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
