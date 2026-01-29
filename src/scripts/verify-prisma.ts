
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking Prisma Client for Vehicle model...");
        if ('vehicle' in prisma) {
            console.log("SUCCESS: prisma.vehicle exists!");
            // @ts-ignore
            const count = await prisma.vehicle.count();
            console.log(`Current vehicle count: ${count}`);
        } else {
            console.error("FAILURE: prisma.vehicle does NOT exist on the client instance.");
            console.log("Keys on prisma:", Object.keys(prisma));
        }
    } catch (e) {
        console.error("Error running check:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
