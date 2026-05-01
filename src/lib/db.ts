import { Prisma, PrismaClient } from "@prisma/client";

// Models that have a deletedAt column. Keep in sync with prisma/schema.prisma.
const SOFT_DELETE_MODELS = new Set<string>([
    "Customer",
    "Product",
    "Invoice",
    "Order",
    "Employee",
]);

// Models that should NOT generate audit-log entries (avoid recursion / noise).
const AUDIT_EXCLUDED_MODELS = new Set<string>([
    "AuditLog",
    "EWayAuditLog",
    "CAAuditLog",
]);

const AUDIT_WRITE_ACTIONS = new Set([
    "create",
    "createMany",
    "update",
    "updateMany",
    "upsert",
    "delete",
    "deleteMany",
]);

const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: ReturnType<typeof createExtendedClient>;
};

const shouldLogDbInit =
    process.env.NODE_ENV !== "production" || process.env.DEBUG_DB_INIT === "true";

const SOFT_DELETE_ENABLED = process.env.DB_DISABLE_SOFT_DELETE !== "true";
const AUDIT_ENABLED = process.env.DB_DISABLE_AUDIT_LOG !== "true";

function createBasePrismaClient(): PrismaClient {
    if (shouldLogDbInit) {
        console.log("--------------- DB INIT (V2) ----------------");
    }

    return new PrismaClient({
        log: ["warn", "error"],
    });
}

function injectSoftDeleteFilter(args: any): any {
    if (!SOFT_DELETE_ENABLED) return args;
    const next = { ...(args ?? {}) };
    if (next.where && Object.prototype.hasOwnProperty.call(next.where, "deletedAt")) {
        return next;
    }
    next.where = { ...(next.where ?? {}), deletedAt: null };
    return next;
}

function buildAuditEntries(
    actor: string | undefined,
    model: string,
    operation: string,
    args: any,
    result: any
): Prisma.AuditLogCreateManyInput[] {
    const entries: Prisma.AuditLogCreateManyInput[] = [];
    const baseEntity = model;
    const action = operation.toUpperCase();

    const pushEntry = (entityId: string | undefined, before: unknown, after: unknown) => {
        const companyId =
            (after as any)?.companyId ??
            (before as any)?.companyId ??
            (args?.data?.companyId as string | undefined) ??
            null;
        entries.push({
            companyId: companyId,
            actor: actor ?? null,
            entity: baseEntity,
            entityId: entityId ?? "unknown",
            action,
            before: (before as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            after: (after as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        });
    };

    if (operation === "create" || operation === "upsert") {
        pushEntry(result?.id, null, result);
    } else if (operation === "createMany") {
        // result is { count }; we don't have inserted ids here
        pushEntry(undefined, null, { count: result?.count ?? 0, data: args?.data });
    } else if (operation === "update") {
        pushEntry(result?.id, args?.where, result);
    } else if (operation === "updateMany") {
        pushEntry(undefined, args?.where, { count: result?.count ?? 0, data: args?.data });
    } else if (operation === "delete") {
        pushEntry(result?.id, result, null);
    } else if (operation === "deleteMany") {
        pushEntry(undefined, args?.where, { count: result?.count ?? 0 });
    }

    return entries;
}

function createExtendedClient() {
    const base = createBasePrismaClient();

    return base.$extends({
        name: "smartvyapar-v2-db",
        query: {
            $allModels: {
                async findFirst({ model, args, query }) {
                    if (SOFT_DELETE_MODELS.has(model)) {
                        return query(injectSoftDeleteFilter(args));
                    }
                    return query(args);
                },
                async findUnique({ model, args, query }) {
                    return query(args);
                },
                async findMany({ model, args, query }) {
                    if (SOFT_DELETE_MODELS.has(model)) {
                        return query(injectSoftDeleteFilter(args));
                    }
                    return query(args);
                },
                async count({ model, args, query }) {
                    if (SOFT_DELETE_MODELS.has(model)) {
                        return query(injectSoftDeleteFilter(args));
                    }
                    return query(args);
                },
                async aggregate({ model, args, query }) {
                    if (SOFT_DELETE_MODELS.has(model)) {
                        return query(injectSoftDeleteFilter(args));
                    }
                    return query(args);
                },

                async delete({ model, args, query }) {
                    if (SOFT_DELETE_ENABLED && SOFT_DELETE_MODELS.has(model)) {
                        const updated = await (base as any)[
                            model.charAt(0).toLowerCase() + model.slice(1)
                        ].update({
                            ...args,
                            data: { deletedAt: new Date() },
                        });
                        await emitAudit(model, "delete", args, updated);
                        return updated;
                    }
                    const result = await query(args);
                    await emitAudit(model, "delete", args, result);
                    return result;
                },
                async deleteMany({ model, args, query }) {
                    if (SOFT_DELETE_ENABLED && SOFT_DELETE_MODELS.has(model)) {
                        const updated = await (base as any)[
                            model.charAt(0).toLowerCase() + model.slice(1)
                        ].updateMany({
                            ...args,
                            data: { deletedAt: new Date() },
                        });
                        await emitAudit(model, "deleteMany", args, updated);
                        return updated;
                    }
                    const result = await query(args);
                    await emitAudit(model, "deleteMany", args, result);
                    return result;
                },

                async create({ model, args, query }) {
                    const result = await query(args);
                    await emitAudit(model, "create", args, result);
                    return result;
                },
                async createMany({ model, args, query }) {
                    const result = await query(args);
                    await emitAudit(model, "createMany", args, result);
                    return result;
                },
                async update({ model, args, query }) {
                    const result = await query(args);
                    await emitAudit(model, "update", args, result);
                    return result;
                },
                async updateMany({ model, args, query }) {
                    const result = await query(args);
                    await emitAudit(model, "updateMany", args, result);
                    return result;
                },
                async upsert({ model, args, query }) {
                    const result = await query(args);
                    await emitAudit(model, "upsert", args, result);
                    return result;
                },
            },
        },
    });

    async function emitAudit(model: string, operation: string, args: any, result: any) {
        if (!AUDIT_ENABLED) return;
        if (AUDIT_EXCLUDED_MODELS.has(model)) return;
        if (!AUDIT_WRITE_ACTIONS.has(operation)) return;

        const actor = (globalThis as any).__svActor as string | undefined;
        const entries = buildAuditEntries(actor, model, operation, args, result);
        if (entries.length === 0) return;

        try {
            await base.auditLog.createMany({ data: entries });
        } catch (err) {
            console.warn("[audit] failed to write audit entries", {
                model,
                operation,
                error: (err as Error)?.message,
            });
        }
    }
}

export const prisma =
    globalForPrisma.prisma ?? createExtendedClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

/**
 * Set the actor identifier (user id, email, "system", "cron", etc.) that the
 * audit log middleware should attribute writes to. Call this at the start of a
 * request handler with the authenticated user, then unset/replace per request.
 */
export function setAuditActor(actor: string | undefined): void {
    (globalThis as any).__svActor = actor;
}

/**
 * Convenience: list models that participate in soft-delete.
 */
export const SOFT_DELETE_MODEL_LIST = Array.from(SOFT_DELETE_MODELS);
