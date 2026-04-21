import type { UserRole } from "@/lib/auth-context";

export function assertCAReadAccess(role: UserRole) {
    if (role !== "CA" && role !== "AUDITOR" && role !== "ADMIN") {
        throw new Error("Access denied: CA/Auditor role required.");
    }
}

export function assertAdminAccess(role: UserRole) {
    if (role !== "ADMIN") {
        throw new Error("Access denied: Admin role required.");
    }
}

export function assertReadOnlyOperation(operation: "EXPORT" | "VIEW") {
    if (operation !== "EXPORT" && operation !== "VIEW") {
        throw new Error("Access denied: write operations are blocked for CA portal.");
    }
}
