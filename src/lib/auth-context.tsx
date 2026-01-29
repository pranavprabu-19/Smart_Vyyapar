"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "ADMIN" | "EMPLOYEE" | "AUDITOR" | "CUSTOMER" | "SO_OFFICIER" | "FIELD_WORKER" | "DRIVER" | null;

interface User {
    id?: string;
    name: string;
    role: UserRole;
    email: string;
    companyName?: string;
    employeeId?: string | null;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User | UserRole) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check local storage for persisted session
        const storedUser = localStorage.getItem("smart_vyapar_user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = (userData: User | UserRole) => {
        let finalUser: User | null = null;

        // Legacy support for string role (from Landing Page demo buttons)
        if (typeof userData === "string") {
            // Redirect to real login page for demo buttons
            if (userData === "ADMIN" || userData === "EMPLOYEE") {
                router.push("/login"); // New flow
                return;
            }

            // Keep mock behavior for others if needed, or redirect everyone
            router.push("/login");
            return;
        } else {
            // Real login from Login Page
            finalUser = userData;
        }

        if (finalUser) {
            setUser(finalUser);
            localStorage.setItem("smart_vyapar_user", JSON.stringify(finalUser));

            // Redirect based on role
            if (finalUser.role === "ADMIN" || finalUser.role === "SO_OFFICIER") {
                router.push("/dashboard");
            } else if (finalUser.role === "DRIVER") {
                router.push("/dashboard/trips");
            } else {
                // Default to employee dashboard for safety (EMPLOYEE and others)
                router.push("/dashboard/employee");
            }
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("smart_vyapar_user");
        router.push("/");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
