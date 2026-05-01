import { prisma } from "@/lib/db";

/**
 * Ensures there is at least one godown and returns its id.
 * We keep a consistent default so stock movements always have a location.
 */
export async function ensureDefaultGodownId(): Promise<string> {
    const godown = await prisma.godown.findFirst({
        orderBy: { createdAt: "asc" },
    });
    if (godown) return godown.id;

    const company = await prisma.company.findFirst();
    if (!company) throw new Error("No company found");

    const created = await prisma.godown.create({
        data: {
            name: "Main Warehouse",
            location: "Primary Location",
            companyId: company.id,
            companyName: company.name,
        },
    });
    return created.id;
}

