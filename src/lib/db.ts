import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

console.log("--------------- DB INIT (Refreshed) ----------------");

// Prisma Client instance
// Force new client to pick up schema changes
export const prisma = new PrismaClient({
    log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
