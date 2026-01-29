
import { prisma } from "../lib/db";

async function main() {
    console.log("Checking prisma.payroll existence...");

    // @ts-ignore
    if (prisma.payroll) {
        console.log("SUCCESS: prisma.payroll is defined and ready.");
        // @ts-ignore
        const count = await prisma.payroll.count();
        console.log(`Current Payroll records: ${count}`);
    } else {
        console.error("FAILURE: prisma.payroll is undefined.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
