/**
 * Live database status snapshot for SmartVyapar V2 on Supabase.
 * Reads from DATABASE_URL (the pooler URL Next.js uses at runtime).
 */
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TABLES = [
  "Company",
  "User",
  "Employee",
  "Customer",
  "Product",
  "Godown",
  "Stock",
  "Vehicle",
  "Trip",
  "TripStop",
  "Invoice",
  "InvoiceItem",
  "Order",
  "OrderItem",
  "Scheme",
  "Payment",
  "PaymentReminder",
  "Photo",
  "Attendance",
  "Payroll",
  "AuditLog",
];

async function main() {
  const t0 = Date.now();
  await prisma.$queryRawUnsafe("SELECT 1");
  const pingMs = Date.now() - t0;

  const dbInfo = await prisma.$queryRawUnsafe(
    "SELECT current_database() as db, current_user as usr, inet_server_addr() as host, version() as ver"
  );

  const counts = {};
  for (const table of TABLES) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as n FROM "${table}"`
      );
      counts[table] = rows[0]?.n ?? 0;
    } catch (e) {
      counts[table] = `ERR:${e.code || e.message.slice(0, 40)}`;
    }
  }

  const invTotal = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM("totalAmount"), 0)::text as total FROM "Invoice"`
  );

  const recent = await prisma.invoice.findMany({
    orderBy: { date: "desc" },
    take: 3,
    select: {
      invoiceNo: true,
      companyName: true,
      date: true,
      totalAmount: true,
      status: true,
    },
  });

  const migrations = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC`
  );

  console.log("=== Connection ===");
  console.log(`  ping: ${pingMs}ms`);
  console.log(`  database: ${dbInfo[0].db}`);
  console.log(`  user:     ${dbInfo[0].usr}`);
  console.log(`  version:  ${dbInfo[0].ver.split(",")[0]}`);

  console.log("\n=== Migrations applied ===");
  for (const m of migrations) {
    console.log(`  ${m.migration_name}  (finished ${m.finished_at?.toISOString?.() || m.finished_at})`);
  }

  console.log("\n=== Row counts ===");
  for (const [t, n] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(20)} ${n}`);
  }

  console.log("\n=== Money reconciliation ===");
  console.log(`  SUM(Invoice.totalAmount) = ${invTotal[0].total}`);

  console.log("\n=== 3 most recent invoices ===");
  for (const inv of recent) {
    console.log(
      `  ${inv.invoiceNo.padEnd(12)} ${inv.date.toISOString().slice(0, 10)}  ${String(
        inv.totalAmount
      ).padStart(10)}  ${inv.status.padEnd(10)}  ${inv.companyName}`
    );
  }
}

main()
  .catch((e) => {
    console.error("DB STATUS FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
