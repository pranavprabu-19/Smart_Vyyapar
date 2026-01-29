
import { prisma } from "../lib/db";

async function main() {
    console.log("Testing Employee Creation...");

    const empId = `TEST-${Date.now()}`;

    try {
        console.log("Creating Emp 1 in Company A...");
        await prisma.employee.create({
            data: {
                name: "Test User 1",
                employeeId: empId,
                companyName: "Company A",
                role: "TEST",
                salaryType: "MONTHLY",
                baseSalary: 1000
            }
        });
        console.log("✅ Emp 1 Created");
    } catch (e) {
        console.error("❌ Failed to create Emp 1", e);
    }

    try {
        console.log("Creating Emp 2 in Company B with SAME ID...");
        await prisma.employee.create({
            data: {
                name: "Test User 2",
                employeeId: empId,
                companyName: "Company B",
                role: "TEST",
                salaryType: "MONTHLY",
                baseSalary: 1000
            }
        });
        console.log("✅ Emp 2 Created (Schema supports per-company uniqueness)");
    } catch (e) {
        console.error("❌ Failed to create Emp 2 (Schema enforces global uniqueness)");
        // console.error(e);
    }
}

main();
