import { cookies } from "next/headers";
import { getServerSession } from "@/lib/server-session";

const DEFAULT_COMPANY = "Sai Associates";

function decodeSelectedCompanyCookie(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

/**
 * Resolve the companyName used for reads/writes.
 *
 * Priority:
 * - server session companyName (if set)
 * - selectedCompany cookie (set by CompanyProvider)
 * - caller-provided companyName
 * - DEFAULT_COMPANY
 *
 * If the session has a companyName and the caller tries to operate on a different company,
 * this throws to prevent cross-company data access.
 */
export async function getScopedCompanyName(requestedCompanyName?: string): Promise<string> {
    const session = await getServerSession();
    const sessionCompany = session?.companyName?.trim() || undefined;

    const store = await cookies();
    const cookieCompany = decodeSelectedCompanyCookie(store.get("selectedCompany")?.value)?.trim() || undefined;

    const requested = requestedCompanyName?.trim() || undefined;
    if (sessionCompany && requested && requested !== sessionCompany) {
        throw new Error("Access denied: company mismatch.");
    }

    return sessionCompany || cookieCompany || requested || DEFAULT_COMPANY;
}

