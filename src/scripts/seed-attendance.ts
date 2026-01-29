
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Employees and Attendance for Payroll Test...");

    const companyName = "Sai Associates";
    const currentMonth = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-indexed

    // 1. Ensure Employees Exist
    // Driver
    const driver = await prisma.employee.upsert({
        where: {
            companyName_employeeId: {
                companyName,
                employeeId: "DRV-001"
            }
        },
        update: { baseSalary: 15000 },
        create: {
            name: "Raju Driver",
            employeeId: "DRV-001",
            role: "DRIVER",
            companyName,
            baseSalary: 15000,
            salaryType: "MONTHLY",
            status: "ACTIVE"
        }
    });

    // Staff
    const staff = await prisma.employee.upsert({
        where: {
            companyName_employeeId: {
                companyName,
                employeeId: "STF-001"
            }
        },
        update: { baseSalary: 12000 },
        create: {
            name: "Suresh Staff",
            employeeId: "STF-001",
            role: "STAFF",
            companyName,
            baseSalary: 12000,
            salaryType: "MONTHLY",
            status: "ACTIVE"
        }
    });

    console.log(`Employees ensured: ${driver.name}, ${staff.name}`);

    // 2. Mark Attendance for this month (e.g., 20 days present)
    const daysToMark = 20;

    for (let i = 1; i <= daysToMark; i++) {
        const date = new Date(year, month, i);

        // Mark Driver Present
        await prisma.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId: driver.id,
                    date: date
                }
            },
            update: { status: 'PRESENT' },
            create: {
                employeeId: driver.id,
                date: date,
                status: 'PRESENT',
                checkIn: "09:00"
            }
        });

        // Mark Staff Present
        await prisma.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId: staff.id,
                    date: date
                }
            },
            update: { status: 'PRESENT' },
            create: {
                employeeId: staff.id,
                date: date,
                status: 'PRESENT',
                checkIn: "09:30"
            }
        });
    }

    console.log(`✅ Marked ${daysToMark} days of attendance for both employees.`);

    // 3. Verification hints
    console.log("Expected Calculation:");
    console.log(`Driver (${driver.baseSalary}): (15000 / 30) * 20 = 10000 approx.`);
    console.log(`Staff (${staff.baseSalary}): (12000 / 30) * 20 = 8000 approx.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
