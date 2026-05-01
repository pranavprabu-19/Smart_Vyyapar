/**
 * SmartVyapar V2 — deterministic seed script.
 *
 * Creates a minimal but realistic dataset so a fresh Postgres database is
 * usable for local development and end-to-end testing immediately after
 * `prisma migrate dev`.
 *
 * Idempotent: each upsert keys on natural identifiers, so running twice
 * does not duplicate rows.
 *
 * Usage: `npm run db:seed`
 */

const { PrismaClient, Prisma } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

const COMPANY_NAME = "Sai Associates";

async function seedCompany() {
  return prisma.company.upsert({
    where: { name: COMPANY_NAME },
    update: {},
    create: {
      name: COMPANY_NAME,
      address: "Plot 24, Anna Nagar",
      city: "Chennai",
      state: "TN",
      pincode: "600040",
      phone: "+91-9876543210",
      email: "ops@saiassociates.in",
      gstin: "33ABCDE1234F1Z5",
      bankName: "ICICI",
      accountNo: "1234567890",
      ifscCode: "ICIC0001234",
      branch: "Anna Nagar",
    },
  });
}

async function seedAdminUser() {
  const password = await hash("admin@123", 10);
  return prisma.user.upsert({
    where: { email: "admin@smartvyapar.local" },
    update: {},
    create: {
      email: "admin@smartvyapar.local",
      name: "SmartVyapar Admin",
      role: "ADMIN",
      password,
      companyName: COMPANY_NAME,
    },
  });
}

async function seedEmployees(companyId) {
  const seeds = [
    { employeeId: "EMP-001", name: "Ravi Kumar", role: "Sales Officer", phone: "+91-9000000001" },
    { employeeId: "EMP-002", name: "Suresh M", role: "Driver", phone: "+91-9000000002" },
  ];
  const employees = [];
  for (const seed of seeds) {
    employees.push(
      await prisma.employee.upsert({
        where: { companyId_employeeId: { companyId, employeeId: seed.employeeId } },
        update: {},
        create: {
          companyId,
          companyName: COMPANY_NAME,
          ...seed,
          baseSalary: new Prisma.Decimal(20000),
        },
      })
    );
  }
  return employees;
}

async function seedCustomers(companyId) {
  const seeds = [
    {
      gstin: "33CUST0001A1Z5",
      name: "Raj Stores",
      address: "12, Velachery",
      state: "TN",
      phone: "+91-8000000001",
      lat: 12.978,
      lng: 80.219,
    },
    {
      gstin: "33CUST0002A1Z5",
      name: "A1 Traders",
      address: "5, T Nagar",
      state: "TN",
      phone: "+91-8000000002",
      lat: 13.04,
      lng: 80.234,
    },
  ];
  const customers = [];
  for (const seed of seeds) {
    customers.push(
      await prisma.customer.upsert({
        where: { companyId_gstin: { companyId, gstin: seed.gstin } },
        update: {},
        create: {
          companyId,
          companyName: COMPANY_NAME,
          ...seed,
        },
      })
    );
  }
  return customers;
}

async function seedProducts(companyId) {
  const seeds = [
    { sku: "PROD-001", name: "Bisleri 1L", category: "Beverages", price: 20, costPrice: 12, stock: 200, gstRate: 18 },
    { sku: "PROD-002", name: "Lays Classic 50g", category: "Snacks", price: 20, costPrice: 12, stock: 150, gstRate: 12 },
    { sku: "PROD-003", name: "Lifebuoy Soap 100g", category: "Hygiene", price: 35, costPrice: 22, stock: 80, gstRate: 18 },
  ];
  const products = [];
  for (const seed of seeds) {
    products.push(
      await prisma.product.upsert({
        where: { companyId_sku: { companyId, sku: seed.sku } },
        update: {},
        create: {
          companyId,
          companyName: COMPANY_NAME,
          name: seed.name,
          sku: seed.sku,
          category: seed.category,
          price: new Prisma.Decimal(seed.price),
          costPrice: new Prisma.Decimal(seed.costPrice),
          stock: seed.stock,
          gstRate: new Prisma.Decimal(seed.gstRate),
        },
      })
    );
  }
  return products;
}

async function main() {
  console.log("Seeding SmartVyapar V2 baseline data...");
  const company = await seedCompany();
  const admin = await seedAdminUser();
  const employees = await seedEmployees(company.id);
  const customers = await seedCustomers(company.id);
  const products = await seedProducts(company.id);

  console.log(
    `Seed complete. company=${company.name} admin=${admin.email} employees=${employees.length} customers=${customers.length} products=${products.length}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
