import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: PrismaClient;
};

const shouldLogDbInit =
    process.env.NODE_ENV !== 'production' || process.env.DEBUG_DB_INIT === 'true';

function createPrismaClient(): PrismaClient {
    if (shouldLogDbInit) {
        console.log("--------------- DB INIT (Refreshed) ----------------");
    }

    return new PrismaClient({
        log: ['warn', 'error'],
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
