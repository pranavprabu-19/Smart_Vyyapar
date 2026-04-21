import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        variant?: "default" | "premium" | "metric" | "glass" | "neon"
    }
>(({ className, variant = "default", ...props }, ref) => {
    const variantStyles = {
        default: "rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200",
        premium: "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm text-card-foreground shadow-lg hover:shadow-xl hover-lift-neon transition-all duration-300",
        metric: "rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 backdrop-blur-sm text-card-foreground shadow-lg hover:shadow-xl hover-lift-neon transition-all duration-300",
        glass: "rounded-xl border border-white/20 bg-white/10 backdrop-blur-lg text-card-foreground shadow-xl hover:shadow-2xl transition-all duration-300",
        neon: "rounded-xl border border-primary/40 bg-card/90 backdrop-blur-sm text-card-foreground shadow-lg card-neon hover-lift-neon transition-all duration-300"
    };
    
    return (
        <div
            ref={ref}
            className={cn(variantStyles[variant], className)}
            {...props}
        />
    );
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-2xl font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
