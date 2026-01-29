import { PrismaClient } from "@prisma/client";
import { REAL_CUSTOMERS, REAL_PRODUCTS } from "../lib/real-data";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting Real Data Seed...");

    // 1. Clean existing data
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
    await prisma.employee.deleteMany();

    console.log("🧹 Cleared existing data.");

    // 2. Seed Company
    const company = await prisma.company.create({
        data: {
            name: "Sai Associates",
            address: "Admin Office: 29 Mettu Street, Ch -69 | Godown: P.No.13, Naikshwar Nagar Main Road, Ch-69",
            phone: "+91 9677150152",
            email: "saiassociates2022@outlook.com",
            gstin: "33AWRPN5543N1ZU",
            bankName: "BANK OF BARODA",
            accountNo: "69000200001485",
            ifscCode: "BARB0VJKUTH",
            branch: "Pallavaram",
        },
    });
    console.log(`🏢 Created Company: ${company.name}`);

    // 3. Seed Products
    console.log("📦 Seeding Products...");
    for (const p of REAL_PRODUCTS) {
        await prisma.product.create({
            data: {
                sku: p.sku,
                name: p.name,
                price: p.price,
                stock: p.stock,
                costPrice: p.costPrice || (p.price * 0.8),
                companyName: company.name,
            },
        });
    }
    console.log(`✅ Seeded ${REAL_PRODUCTS.length} Products.`);

    // 4. Seed Customers
    console.log("👥 Seeding Customers...");
    for (const c of REAL_CUSTOMERS) {
        await prisma.customer.create({
            data: {
                name: c.name,
                address: c.location,
                state: "Tamil Nadu",
                lat: c.lat,
                lng: c.lng,
                balance: c.balance,
                phone: c.phone,
                companyName: company.name,
            },
        });
    }
    console.log(`✅ Seeded ${REAL_CUSTOMERS.length} Customers.`);

    // 5. Seed Admin User
    await prisma.user.create({
        data: {
            email: "admin@example.com",
            name: "Admin User",
            role: "ADMIN",
            password: "hashed_password_here",
            companyName: company.name,
        },
    });
    console.log("👤 Created Admin User");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
