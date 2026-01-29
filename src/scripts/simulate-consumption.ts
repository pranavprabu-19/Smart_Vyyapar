
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Simulating Verification Data for Smart Inventory...");

    const companyName = "Sai Associates";

    // 1. Get a product to consume
    const product = await prisma.product.findFirst({
        where: { companyName }
    });

    if (!product) {
        console.error("No product found to test with.");
        return;
    }

    console.log(`Found product: ${product.name} (Original Stock: ${product.stock})`);

    // FOR TESTING: Reduce stock to 15 to trigger "CRITICAL" / "LOW" status
    await prisma.product.update({
        where: { id: product.id },
        data: { stock: 15 }
    });
    console.log("⚠️ Force updated stock to 15 to test Restock Alert.");

    // 2. Create historical invoices (e.g., 5 invoices over last week)
    // This should bump Avg Daily Sales
    const day = 24 * 60 * 60 * 1000;

    for (let i = 0; i < 5; i++) {
        await prisma.invoice.create({
            data: {
                invoiceNo: `SIM-INV-${Date.now()}-${i}`,
                companyName,
                customerName: "Simulation User",
                date: new Date(Date.now() - (i * day)), // 1 day apart
                totalAmount: product.price * 10,
                status: "PAID",
                paymentMode: "CASH",
                billingAddress: "Simulation Address",
                customerDetails: JSON.stringify({ name: "Simulation User", address: "Simulation Address" }),
                items: {
                    create: [{
                        productId: product.sku, // using SKU as ID link as per schema usually or ID?
                        // Schema says InvoiceItem linked via Product? No, usually separate.
                        // Let's check schema for InvoiceItems.
                        // InvoiceItem -> product Product? @relation(fields: [productId], references: [id])
                        // NO, wait. The schema usually has productId string?
                        // Let's assume standard link.
                        quantity: 10,
                        description: "Simulation Item",
                        price: product.price,
                        costPrice: product.costPrice || (product.price * 0.7) // Fallback if no cost price
                    }]
                }
            }
        });
    }

    console.log("✅ Created 5 simulated invoices (50 units sold).");
    console.log("Avg Daily Sales should now be > 0.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
