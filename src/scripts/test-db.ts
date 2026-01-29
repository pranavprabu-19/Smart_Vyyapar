
import { PrismaClient } from '@prisma/client';

async function main() {
    console.log("Testing Prisma Connection...");
    try {
        const prisma = new PrismaClient({
            log: ['info', 'warn', 'error'],
        });
        console.log("Prisma Client initialized.");

        await prisma.$connect();
        console.log("Successfully connected to database.");

        const count = await prisma.customer.count();
        console.log(`Customer count: ${count}`);

        await prisma.$disconnect();
    } catch (e) {
        console.error("Prisma Error:", e);
        process.exit(1);
    }
}

main();
