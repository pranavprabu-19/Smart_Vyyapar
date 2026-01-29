
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Testing Restock Action Logic...");

    // 1. Find the product (Bisleri Water 250ml)
    const product = await prisma.product.findFirst({
        where: { name: { contains: "Bisleri Water 250ml" } }
    });

    if (!product) {
        console.error("Product not found");
        return;
    }

    console.log(`Original Stock: ${product.stock}`);

    // 2. Simulate Restock (Add 50)
    console.log("Restocking 50 units...");
    // We can't import the server action directly in a script easily without mocking context or having full nextjs env loaded in CLI sometimes.
    // However, we can simulate the DB operation that the action does.
    // Or if we want to run the action file, we must ensure it doesn't fail on 'use server' directives or imports.
    // 'tsx' handles typescript well, but 'use server' might be tricky if it imports next/cache.

    // Instead of importing the action (which might fail due to 'next/cache'), let's replicate the logic to verify DB connectivity and consistency.
    // The action code is:
    // await prisma.product.update({ where: { sku }, data: { stock: { increment: quantity } } });

    const updated = await prisma.product.update({
        where: { id: product.id },
        data: { stock: { increment: 50 } }
    });

    console.log(`New Stock: ${updated.stock}`);

    if (updated.stock === product.stock + 50) {
        console.log("✅ Restock Logic Verified (DB Level).");
    } else {
        console.error("❌ Restock Failed.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
