
import { prisma } from "@/lib/db";

async function main() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        include: {
            items: true
        }
    });

    console.log(`Found ${invoices.length} invoices created today.`);
    invoices.forEach(inv => {
        console.log(`- Invoice #${inv.invoiceNo}: ${inv.customerDetails} (${inv.totalAmount})`);
    });
}

main();
