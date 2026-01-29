
import { PrismaClient } from "@prisma/client";
import { REAL_PRODUCTS } from "../lib/real-data";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Products...");
    const COMPANY = "Sai Associates";

    for (const p of REAL_PRODUCTS) {
        await prisma.product.upsert({
            where: { sku: p.sku },
            update: {
                stock: p.stock,
                costPrice: p.costPrice || (p.price * 0.7),
                price: p.price
            },
            create: {
                sku: p.sku,
                name: p.name,
                price: p.price,
                stock: p.stock,
                costPrice: p.costPrice || (p.price * 0.7),
                category: "Beverages",
                companyName: COMPANY
            }
        });
        console.log(`Upserted ${p.sku}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
