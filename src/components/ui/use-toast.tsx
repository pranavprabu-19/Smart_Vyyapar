"use client"

// Simplified toast 
import { useState, useEffect } from "react"

export const useToast = () => {
    const [toasts, setToasts] = useState<any[]>([])

    const toast = ({ title, description, variant }: any) => {
        console.log("Toast:", title, description)
        // In a real app, this would add to a provider. For now, just logging or alert if critical.
        if (variant === 'destructive') {
            // alert(`${title}: ${description}`)
        }
    }

    return { toast, toasts: [] }
}
