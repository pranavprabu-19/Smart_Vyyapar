"use server";

import { prisma } from "@/lib/db";
import { assertCAReadAccess, assertReadOnlyOperation } from "@/lib/access-guards";
import { getServerSession } from "@/lib/server-session";

function toCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escapeCell = (value: unknown) => {
        const str = value == null ? "" : String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const lines = [
        headers.join(","),
        ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
    ];
    return lines.join("\n");
}

async function logCAActivity(companyName: string, caUserEmail: string | undefined, action: string, details?: string) {
    try {
        await prisma.$executeRaw`
            INSERT INTO CAAuditLog (id, companyName, caUserEmail, action, details, createdAt)
            VALUES (
                ${`calog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
                ${companyName},
                ${caUserEmail || null},
                ${action},
                ${details || null},
                ${new Date().toISOString()}
            )
        `;
    } catch {
        // If migration not applied yet, keep exports functional.
    }
}

export async function exportCASalesRegisterAction(input: {
    companyName: string;
    month: number;
    year: number;
    caUserEmail?: string;
}) {
    const session = await getServerSession();
    if (!session) return { success: false, error: "Unauthorized session." };
    if (session.role !== "ADMIN" && session.companyName !== input.companyName) {
        return { success: false, error: "Forbidden company scope." };
    }

    assertReadOnlyOperation("EXPORT");
    assertCAReadAccess(session.role);

    const start = new Date(input.year, input.month - 1, 1);
    const end = new Date(input.year, input.month, 1);

    const invoices = await prisma.invoice.findMany({
        where: {
            companyName: input.companyName,
            date: { gte: start, lt: end },
        },
        include: { items: true },
        orderBy: { date: "asc" },
    });

    const rows = invoices.flatMap((inv) =>
        inv.items.map((item) => ({
            invoiceNo: inv.invoiceNo,
            invoiceDate: inv.date.toISOString().split("T")[0],
            customerName: inv.customerName,
            productDescription: item.description,
            hsn: item.hsn || "",
            quantity: item.quantity,
            unitPrice: Number(item.price.toFixed(2)),
            lineTaxableValue: Number((item.quantity * item.price).toFixed(2)),
            gstRate: item.gstRate,
            paymentMode: inv.paymentMode,
            status: inv.status,
        }))
    );

    await logCAActivity(
        input.companyName,
        input.caUserEmail,
        "EXPORT_SALES_REGISTER",
        `month=${input.month},year=${input.year},rows=${rows.length}`
    );

    return {
        success: true,
        fileName: `sales_register_${input.companyName}_${input.year}_${String(input.month).padStart(2, "0")}.csv`,
        csv: toCsv(rows),
        rowCount: rows.length,
    };
}

export async function exportCAEWaySummaryAction(input: {
    companyName: string;
    month: number;
    year: number;
    caUserEmail?: string;
}) {
    const session = await getServerSession();
    if (!session) return { success: false, error: "Unauthorized session." };
    if (session.role !== "ADMIN" && session.companyName !== input.companyName) {
        return { success: false, error: "Forbidden company scope." };
    }

    assertReadOnlyOperation("EXPORT");
    assertCAReadAccess(session.role);

    const start = new Date(input.year, input.month - 1, 1);
    const end = new Date(input.year, input.month, 1);

    const logs = await prisma.$queryRaw<Array<any>>`
        SELECT action, status, message, provider, createdAt
        FROM EWayAuditLog
        WHERE companyId IN (
            SELECT id FROM Company WHERE name = ${input.companyName}
        )
        AND createdAt >= ${start.toISOString()}
        AND createdAt < ${end.toISOString()}
        ORDER BY createdAt ASC
    `;

    const rows = logs.map((log) => ({
        action: log.action,
        status: log.status,
        provider: log.provider || "",
        message: log.message || "",
        createdAt: new Date(log.createdAt).toISOString(),
    }));

    await logCAActivity(
        input.companyName,
        input.caUserEmail,
        "EXPORT_EWAY_SUMMARY",
        `month=${input.month},year=${input.year},rows=${rows.length}`
    );

    return {
        success: true,
        fileName: `eway_summary_${input.companyName}_${input.year}_${String(input.month).padStart(2, "0")}.csv`,
        csv: toCsv(rows),
        rowCount: rows.length,
    };
}

