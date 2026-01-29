
import { PrismaClient } from "@prisma/client";
import { REAL_PRODUCTS, REAL_CUSTOMERS } from "../lib/real-data"; // Adjust path if needed

const prisma = new PrismaClient();

async function main() {
    console.log("Starting seed...");

    // 1. Seed Products
    console.log(`Seeding ${REAL_PRODUCTS.length} Products...`);
    for (const p of REAL_PRODUCTS) {
        await prisma.product.upsert({
            where: { sku: p.sku },
            update: {
                price: p.price,
                stock: p.stock,
                costPrice: p.costPrice || 0,
                // Do not overwrite name if it exists, maybe user changed it? 
                // Getting fresh from config is safer for now.
                name: p.name,
            },
            create: {
                sku: p.sku,
                name: p.name,
                price: p.price,
                stock: p.stock,
                costPrice: p.costPrice || 0,
                companyName: "Sai Associates",
                category: p.name.includes("Water") ? "Water" : "Beverage"
            }
        });
    }

    // 2. Seed Customers
    console.log(`Seeding ${REAL_CUSTOMERS.length} Customers...`);
    for (const c of REAL_CUSTOMERS) {
        // Use ID if possible, but ID is "CUST001" which might not match CUID if we let prisma gen.
        // Schema says id is CUID default.
        // We can force the ID if we want to keep consistency with static files, 
        // OR we map by Name/Phone.
        // Schema Customer has @id @default(cuid()).
        // Let's rely on finding by Name for upsert if ID doesn't match format, 
        // BUT static data has IDs like CUST001. 
        // If we want to keep CUST001, we should probably allow custom IDs or update schema.
        // Current Schema: id String @id @default(cuid())
        // Prisma allows setting ID manually even if default exists.

        await prisma.customer.upsert({
            where: { id: c.id }, // Try to match by the ID in our static file
            update: {
                lat: c.lat,
                lng: c.lng,
                phone: c.phone,
                balance: c.balance,
                address: c.location // Map location to address
            },
            create: {
                id: c.id,
                name: c.name,
                address: c.location,
                state: "Tamil Nadu",
                phone: c.phone,
                lat: c.lat,
                lng: c.lng,
                balance: c.balance,
                companyName: "Sai Associates"
            }
        });
    }

    console.log("Seeding completed.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
