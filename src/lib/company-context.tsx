"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Company = string;

interface CompanyContextType {
    currentCompany: string;
    setCompany: (company: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

import { useRouter } from "next/navigation";

export function CompanyProvider({ children }: { children: React.ReactNode }) {
    const [currentCompany, setCurrentCompany] = useState<Company>("Sai Associates");
    const router = useRouter();

    const setCompany = (company: string) => {
        setCurrentCompany(company);
        // Set cookie for server components
        document.cookie = `selectedCompany=${encodeURIComponent(company)}; path=/; max-age=31536000`; // 1 year
        // Refresh server components
        router.refresh();
    };

    // Initialize from cookie on mount if needed, or rely on default
    useEffect(() => {
        const match = document.cookie.match(new RegExp('(^| )selectedCompany=([^;]+)'));
        if (match) {
            setCurrentCompany(decodeURIComponent(match[2]));
        }
    }, []);

    return (
        <CompanyContext.Provider value={{ currentCompany, setCompany }}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompany() {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error("useCompany must be used within a CompanyProvider");
    }
    return context;
}
