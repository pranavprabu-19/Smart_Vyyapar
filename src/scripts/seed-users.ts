
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Users...");

    const COMPANY = "Sai Associates";

    // 1. Create Admin
    const adminEmail = "admin@saigroup.in";
    const adminPass = "Admin@123";

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            name: "Suresh (Admin)",
            email: adminEmail,
            role: "ADMIN",
            password: adminPass,
            companyName: COMPANY
        }
    });
    console.log(`Admin created: ${adminEmail} / ${adminPass}`);

    // 2. Create Employee (Sales Officer)
    const empId = "EMP001";
    const empPass = "Staff@123";

    // Create Employee Profile
    const empProfile = await prisma.employee.upsert({
        where: {
            companyName_employeeId: {
                companyName: COMPANY,
                employeeId: empId
            }
        },
        update: {},
        create: {
            name: "Ramesh (Sales)",
            employeeId: empId,
            companyName: COMPANY,
            role: "SO_OFFICIER",
            email: "ramesh@example.com",
            phone: "9876543210",
            baseSalary: 15000,
            salaryType: "MONTHLY"
        }
    });

    // Create User Login for Employee
    await prisma.user.upsert({
        where: { email: "ramesh@example.com" },
        update: {},
        create: {
            name: "Ramesh",
            email: "ramesh@example.com",
            role: "SO_OFFICIER",
            password: empPass,
            companyName: COMPANY,
            employeeId: empProfile.id
        }
    });
    console.log(`Employee created: ID: ${empId} / Pass: ${empPass}`);

    // 3. Create Driver
    const drvId = "DRV001";
    const drvPass = "Driver@123";

    const drvProfile = await prisma.employee.upsert({
        where: {
            companyName_employeeId: {
                companyName: COMPANY,
                employeeId: drvId
            }
        },
        update: {},
        create: {
            name: "Velu (Driver)",
            employeeId: drvId,
            companyName: COMPANY,
            role: "DRIVER",
            email: "velu@example.com",
            phone: "9876543211",
            baseSalary: 12000,
            salaryType: "MONTHLY"
        }
    });

    await prisma.user.upsert({
        where: { email: "velu@example.com" },
        update: {},
        create: {
            name: "Velu",
            email: "velu@example.com",
            role: "DRIVER",
            password: drvPass,
            companyName: COMPANY,
            employeeId: drvProfile.id
        }
    });
    console.log(`Driver created: ID: ${drvId} / Pass: ${drvPass}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
