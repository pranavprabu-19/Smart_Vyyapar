/**
 * SmartVyapar V2 — one-shot SQLite ? Postgres cutover.
 *
 * Reads the legacy SQLite snapshot at LEGACY_SQLITE_PATH and copies all rows
 * into the V2 Postgres schema referenced by DATABASE_URL. Performs the
 * transformations the V2 plan requires:
 *   - Materialises a Company row for every distinct companyName.
 *   - Backfills companyId on every tenant-scoped table.
 *   - Parses string-JSON columns into structured objects (jsonb-ready).
 *   - Forwards Float money columns into Decimal columns.
 *   - Skips audit-log generation while the cutover runs.
 *
 * Pre-requisites:
 *   1. `npx prisma migrate deploy` has been run against the target Postgres
 *      database (so all tables exist and are empty).
 *   2. LEGACY_SQLITE_PATH points at the .db / .bak file created with
 *      `cp prisma/dev.db prisma/backups/...`.
 *   3. `node --version` is >= 22.5 (built-in `node:sqlite` is required).
 *
 * Verification: after the script finishes, it prints per-table row counts
 * and the sum of `Invoice.totalAmount` from both sides.
 *
 * Usage: `npm run cutover:sqlite-to-pg`
 */

const path = require("path");
const fs = require("fs");

require("dotenv").config();

let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (err) {
  console.error(
    "node:sqlite is not available. Upgrade Node to >= 22.5, or install better-sqlite3 and adapt this script."
  );
  process.exit(1);
}

const { PrismaClient, Prisma } = require("@prisma/client");

process.env.DB_DISABLE_AUDIT_LOG = "true";
process.env.DB_DISABLE_SOFT_DELETE = "true";

const prisma = new PrismaClient();

const LEGACY_PATH = path.resolve(
  process.cwd(),
  process.env.LEGACY_SQLITE_PATH || "prisma/backups/dev.db"
);

// Columns whose TEXT JSON values must be parsed into objects.
const JSON_COLUMNS = {
  Invoice: ["customerDetails"],
  Photo: ["stockSnapshot"],
  Visit: ["photoIds"],
  Trip: ["startLocation"],
  Vehicle: ["details"],
  Scheme: [
    "applicableProducts",
    "applicableCustomers",
    "customerTiers",
    "applicableCategories",
  ],
  VanLoad: ["plannedRoute", "actualRoute"],
  VanSale: ["items"],
};

function readTable(db, table) {
  const stmt = db.prepare(`SELECT * FROM "${table}"`);
  return stmt.all();
}

function tableExists(db, table) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(table);
  return Boolean(row);
}

function parseJsonColumns(table, row) {
  const fields = JSON_COLUMNS[table];
  if (!fields) return row;
  const next = { ...row };
  for (const field of fields) {
    const value = next[field];
    if (typeof value === "string" && value.length > 0) {
      try {
        next[field] = JSON.parse(value);
      } catch {
        next[field] = value;
      }
    }
  }
  return next;
}

async function migrateCompanies(db) {
  const seen = new Set();
  const companies = [];

  if (tableExists(db, "Company")) {
    for (const row of readTable(db, "Company")) {
      seen.add(row.name);
      companies.push(row);
    }
  }

  // Discover companyName values that did not exist in Company table.
  const tablesWithCompanyName = [
    "Invoice",
    "Customer",
    "Product",
    "Employee",
    "Trip",
    "Beat",
    "Visit",
    "Order",
    "Scheme",
    "Payment",
    "PaymentReminder",
    "ReminderTemplate",
    "SalesReturn",
    "CreditNote",
    "VanLoad",
    "Asset",
    "Photo",
    "CAAuditLog",
    "CAInviteToken",
    "CreditLimitAction",
  ];

  for (const table of tablesWithCompanyName) {
    if (!tableExists(db, table)) continue;
    for (const row of readTable(db, table)) {
      const name = row.companyName;
      if (name && !seen.has(name)) {
        seen.add(name);
        companies.push({
          id: undefined,
          name,
          address: "(unknown)",
        });
      }
    }
  }

  const idByName = new Map();
  for (const c of companies) {
    const created = await prisma.company.upsert({
      where: { name: c.name },
      update: {},
      create: {
        id: c.id || undefined,
        name: c.name,
        address: c.address || "(unknown)",
        city: c.city,
        state: c.state,
        pincode: c.pincode,
        phone: c.phone,
        email: c.email,
        gstin: c.gstin,
        bankName: c.bankName,
        accountNo: c.accountNo,
        ifscCode: c.ifscCode,
        branch: c.branch,
        logoUrl: c.logoUrl,
        signatureUrl: c.signatureUrl,
        whatsappApiKey: c.whatsappApiKey,
        whatsappPhoneId: c.whatsappPhoneId,
        invoiceTemplateId: c.invoiceTemplateId,
        emailSmtpHost: c.emailSmtpHost,
        emailUser: c.emailUser,
        emailPassword: c.emailPassword,
        ewayProvider: c.ewayProvider,
        ewayEnvironment: c.ewayEnvironment || "SANDBOX",
        ewayEnabled: Boolean(c.ewayEnabled),
        ewayClientId: c.ewayClientId,
        ewayClientSecret: c.ewayClientSecret,
        ewayUsername: c.ewayUsername,
        ewayPassword: c.ewayPassword,
        ewayGstin: c.ewayGstin,
        ewayCredentialUpdatedAt: c.ewayCredentialUpdatedAt
          ? new Date(c.ewayCredentialUpdatedAt)
          : null,
        ewayLastTestedAt: c.ewayLastTestedAt ? new Date(c.ewayLastTestedAt) : null,
        ewayLastTestStatus: c.ewayLastTestStatus,
        ewayLastTestMessage: c.ewayLastTestMessage,
      },
    });
    idByName.set(c.name, created.id);
  }

  return idByName;
}

function pickCompanyId(idByName, companyName) {
  if (companyName && idByName.has(companyName)) return idByName.get(companyName);
  // fallback: use the first company
  const first = idByName.values().next().value;
  return first;
}

function dt(value) {
  if (value === null || value === undefined) return null;
  return new Date(value);
}

function dec(value) {
  if (value === null || value === undefined) return undefined;
  return new Prisma.Decimal(value);
}

function bool(value) {
  return Boolean(value);
}

async function copyTable(table, db, transformer, prismaModel) {
  if (!tableExists(db, table)) {
    console.log(`  ${table}: skipped (not present in legacy db)`);
    return 0;
  }
  const rows = readTable(db, table);
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows`);
    return 0;
  }
  let copied = 0;
  for (const raw of rows) {
    const parsed = parseJsonColumns(table, raw);
    const data = transformer(parsed);
    if (!data) continue;
    try {
      await prismaModel.create({ data });
      copied += 1;
    } catch (err) {
      console.warn(`  ${table}: row failed (${err.message}). Continuing.`);
    }
  }
  console.log(`  ${table}: ${copied}/${rows.length} rows copied`);
  return copied;
}

async function run() {
  console.log(`Cutover: legacy=${LEGACY_PATH}`);
  if (!fs.existsSync(LEGACY_PATH)) {
    console.error("Legacy SQLite file not found at LEGACY_SQLITE_PATH");
    process.exit(1);
  }

  const db = new DatabaseSync(LEGACY_PATH, { readOnly: true });

  console.log("Step 1: companies");
  const idByName = await migrateCompanies(db);
  console.log(`  Created/loaded ${idByName.size} company rows`);

  const cidFor = (row) => pickCompanyId(idByName, row.companyName);

  console.log("Step 2: employees");
  await copyTable("Employee", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    employeeId: r.employeeId,
    name: r.name,
    role: r.role,
    email: r.email,
    phone: r.phone,
    address: r.address,
    aadhaar: r.aadhaar,
    pan: r.pan,
    salaryType: r.salaryType,
    baseSalary: dec(r.baseSalary),
    status: r.status,
    joiningDate: dt(r.joiningDate),
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.employee);

  console.log("Step 3: users");
  await copyTable("User", db, (r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    password: r.password,
    companyName: r.companyName,
    employeeId: r.employeeId,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.user);

  console.log("Step 4: customers");
  await copyTable("Customer", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    name: r.name,
    address: r.address,
    state: r.state,
    gstin: r.gstin,
    phone: r.phone,
    email: r.email,
    lat: r.lat,
    lng: r.lng,
    mapLink: r.mapLink,
    balance: dec(r.balance),
    totalRevenue: dec(r.totalRevenue),
    lastInvoiceNo: r.lastInvoiceNo,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.customer);

  console.log("Step 5: products + godowns + stocks");
  await copyTable("Product", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    sku: r.sku,
    name: r.name,
    category: r.category,
    price: dec(r.price),
    stock: r.stock,
    image: r.image,
    minStock: r.minStock,
    costPrice: dec(r.costPrice),
    reorderQuantity: r.reorderQuantity,
    supplierEmail: r.supplierEmail,
    gstRate: dec(r.gstRate),
    isLiquidationCandidate: bool(r.isLiquidationCandidate),
    liquidationFlaggedAt: dt(r.liquidationFlaggedAt),
    liquidationReason: r.liquidationReason,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.product);

  // Godown didn't have companyName — assign all to the first company.
  const fallbackCid = idByName.values().next().value;
  await copyTable("Godown", db, (r) => ({
    id: r.id,
    companyId: fallbackCid,
    name: r.name,
    location: r.location,
    manager: r.manager,
    contact: r.contact,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.godown);

  await copyTable("Stock", db, (r) => ({
    id: r.id,
    productId: r.productId,
    godownId: r.godownId,
    quantity: r.quantity,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.stock);

  console.log("Step 6: vehicles, trips, trip stops");
  await copyTable("Vehicle", db, (r) => ({
    id: r.id,
    companyId: fallbackCid,
    regNo: r.regNo,
    model: r.model,
    type: r.type,
    status: r.status,
    fuelType: r.fuelType,
    totalDistance: r.totalDistance,
    lastServiceDate: dt(r.lastServiceDate),
    details: r.details,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.vehicle);

  await copyTable("Trip", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    driverName: r.driverName,
    vehicleNo: r.vehicleNo,
    vehicleId: r.vehicleId,
    status: r.status,
    startTime: dt(r.startTime),
    endTime: dt(r.endTime),
    startLocation: r.startLocation,
    totalDistance: r.totalDistance,
    fuelCost: dec(r.fuelCost),
    foodCost: dec(r.foodCost),
    otherExp: dec(r.otherExp),
    allowance: dec(r.allowance),
    startReading: r.startReading,
    endReading: r.endReading,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.trip);

  await copyTable("TripStop", db, (r) => ({
    id: r.id,
    tripId: r.tripId,
    customerName: r.customerName,
    address: r.address,
    items: r.items,
    status: r.status,
    timestamp: dt(r.timestamp),
    lat: r.lat,
    lng: r.lng,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.tripStop);

  console.log("Step 7: invoices, invoice items");
  await copyTable("Invoice", db, (r) => ({
    id: r.id,
    invoiceNo: r.invoiceNo,
    companyId: cidFor(r),
    companyName: r.companyName,
    customerName: r.customerName,
    customerId: r.customerId,
    employeeId: r.employeeId,
    totalAmount: dec(r.totalAmount),
    date: dt(r.date),
    paymentMode: r.paymentMode,
    status: r.status,
    dueDate: dt(r.dueDate),
    paidAmount: dec(r.paidAmount),
    customerDetails: r.customerDetails ?? {},
    billingAddress: r.billingAddress,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.invoice);

  await copyTable("InvoiceItem", db, (r) => ({
    id: r.id,
    invoiceId: r.invoiceId,
    productId: r.productId,
    description: r.description,
    quantity: r.quantity,
    price: dec(r.price),
    costPrice: dec(r.costPrice),
    hsn: r.hsn,
    gstRate: dec(r.gstRate),
  }), prisma.invoiceItem);

  console.log("Step 8: orders, order items, beat plans, visits");
  await copyTable("Order", db, (r) => ({
    id: r.id,
    orderNo: r.orderNo,
    companyId: cidFor(r),
    companyName: r.companyName,
    customerId: r.customerId,
    employeeId: r.employeeId,
    status: r.status,
    subtotal: dec(r.subtotal),
    discountAmount: dec(r.discountAmount),
    schemeDiscount: dec(r.schemeDiscount),
    taxAmount: dec(r.taxAmount),
    totalAmount: dec(r.totalAmount),
    approvedBy: r.approvedBy,
    approvedAt: dt(r.approvedAt),
    rejectedBy: r.rejectedBy,
    rejectedAt: dt(r.rejectedAt),
    rejectionReason: r.rejectionReason,
    dispatchedAt: dt(r.dispatchedAt),
    deliveredAt: dt(r.deliveredAt),
    deliveryNotes: r.deliveryNotes,
    invoiceId: r.invoiceId,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.order);

  await copyTable("OrderItem", db, (r) => ({
    id: r.id,
    orderId: r.orderId,
    productId: r.productId,
    quantity: r.quantity,
    price: dec(r.price),
    discount: dec(r.discount),
    gstRate: dec(r.gstRate),
    total: dec(r.total),
  }), prisma.orderItem);

  await copyTable("Beat", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    name: r.name,
    description: r.description,
    dayOfWeek: r.dayOfWeek,
    employeeId: r.employeeId,
    isActive: bool(r.isActive),
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.beat);

  await copyTable("BeatCustomer", db, (r) => ({
    id: r.id,
    beatId: r.beatId,
    customerId: r.customerId,
    sequence: r.sequence,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.beatCustomer);

  await copyTable("Visit", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    employeeId: r.employeeId,
    customerId: r.customerId,
    beatId: r.beatId,
    checkInTime: dt(r.checkInTime),
    checkInLat: r.checkInLat,
    checkInLng: r.checkInLng,
    checkOutTime: dt(r.checkOutTime),
    checkOutLat: r.checkOutLat,
    checkOutLng: r.checkOutLng,
    status: r.status,
    notes: r.notes,
    photoIds: r.photoIds,
    orderId: r.orderId,
    duration: r.duration,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.visit);

  console.log("Step 9: schemes, payments, returns, credit notes");
  await copyTable("Scheme", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    name: r.name,
    description: r.description,
    type: r.type,
    minQuantity: r.minQuantity,
    minAmount: dec(r.minAmount),
    buyQuantity: r.buyQuantity,
    getQuantity: r.getQuantity,
    discountPercent: dec(r.discountPercent),
    discountAmount: dec(r.discountAmount),
    freeProductId: r.freeProductId,
    startDate: dt(r.startDate),
    endDate: dt(r.endDate),
    isActive: bool(r.isActive),
    applicableProducts: r.applicableProducts,
    applicableCustomers: r.applicableCustomers,
    customerTiers: r.customerTiers,
    applicableCategories: r.applicableCategories,
    budget: dec(r.budget),
    usedBudget: dec(r.usedBudget),
    maxUsagePerCustomer: r.maxUsagePerCustomer,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.scheme);

  await copyTable("OrderScheme", db, (r) => ({
    id: r.id,
    orderId: r.orderId,
    schemeId: r.schemeId,
    discount: dec(r.discount),
    description: r.description,
  }), prisma.orderScheme);

  await copyTable("CustomerCredit", db, (r) => ({
    id: r.id,
    customerId: r.customerId,
    creditLimit: dec(r.creditLimit),
    currentBalance: dec(r.currentBalance),
    availableCredit: dec(r.availableCredit),
    lastPaymentDate: dt(r.lastPaymentDate),
    lastPaymentAmount: dec(r.lastPaymentAmount),
    creditDays: r.creditDays,
    tier: r.tier,
    isBlocked: bool(r.isBlocked),
    blockReason: r.blockReason,
    blockedAt: dt(r.blockedAt),
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.customerCredit);

  await copyTable("CreditLimitAction", db, (r) => ({
    id: r.id,
    customerCreditId: r.customerCreditId,
    companyId: cidFor(r),
    companyName: r.companyName,
    previousLimit: dec(r.previousLimit),
    newLimit: dec(r.newLimit),
    riskScore: r.riskScore,
    policyAction: r.policyAction,
    reason: r.reason,
    notificationStatus: r.notificationStatus,
    createdAt: dt(r.createdAt),
  }), prisma.creditLimitAction);

  await copyTable("Payment", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    paymentNo: r.paymentNo,
    customerId: r.customerId,
    invoiceId: r.invoiceId,
    amount: dec(r.amount),
    mode: r.mode,
    reference: r.reference,
    chequeNo: r.chequeNo,
    chequeDate: dt(r.chequeDate),
    bankName: r.bankName,
    status: r.status,
    collectedBy: r.collectedBy,
    collectedAt: dt(r.collectedAt),
    notes: r.notes,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.payment);

  await copyTable("PaymentReminder", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    customerId: r.customerId,
    invoiceId: r.invoiceId,
    dueAmount: dec(r.dueAmount),
    dueDate: dt(r.dueDate),
    daysPastDue: r.daysPastDue,
    messageText: r.messageText,
    channel: r.channel,
    phoneNumber: r.phoneNumber,
    sentAt: dt(r.sentAt),
    deliveredAt: dt(r.deliveredAt),
    status: r.status,
    errorMessage: r.errorMessage,
    reminderType: r.reminderType,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.paymentReminder);

  await copyTable("ReminderTemplate", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    name: r.name,
    type: r.type,
    messageTemplate: r.messageTemplate,
    triggerDays: r.triggerDays,
    isActive: bool(r.isActive),
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.reminderTemplate);

  await copyTable("SalesReturn", db, (r) => ({
    id: r.id,
    returnNo: r.returnNo,
    companyId: cidFor(r),
    companyName: r.companyName,
    customerId: r.customerId,
    invoiceId: r.invoiceId,
    reason: r.reason,
    description: r.description,
    status: r.status,
    totalAmount: dec(r.totalAmount),
    approvedBy: r.approvedBy,
    approvedAt: dt(r.approvedAt),
    rejectedBy: r.rejectedBy,
    rejectedAt: dt(r.rejectedAt),
    rejectionReason: r.rejectionReason,
    stockAdjusted: bool(r.stockAdjusted),
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.salesReturn);

  await copyTable("ReturnItem", db, (r) => ({
    id: r.id,
    returnId: r.returnId,
    productId: r.productId,
    quantity: r.quantity,
    price: dec(r.price),
    total: dec(r.total),
    reason: r.reason,
    condition: r.condition,
  }), prisma.returnItem);

  await copyTable("CreditNote", db, (r) => ({
    id: r.id,
    creditNoteNo: r.creditNoteNo,
    companyId: cidFor(r),
    companyName: r.companyName,
    customerId: r.customerId,
    returnId: r.returnId,
    amount: dec(r.amount),
    reason: r.reason,
    status: r.status,
    usedAmount: dec(r.usedAmount),
    balanceAmount: dec(r.balanceAmount),
    usedInInvoiceId: r.usedInInvoiceId,
    expiryDate: dt(r.expiryDate),
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.creditNote);

  console.log("Step 10: van loads, sales");
  await copyTable("VanLoad", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    loadNo: r.loadNo,
    vehicleId: r.vehicleId,
    driverId: r.driverId,
    status: r.status,
    loadedAt: dt(r.loadedAt),
    dispatchedAt: dt(r.dispatchedAt),
    completedAt: dt(r.completedAt),
    plannedRoute: r.plannedRoute,
    actualRoute: r.actualRoute,
    totalLoaded: dec(r.totalLoaded),
    totalSold: dec(r.totalSold),
    totalCash: dec(r.totalCash),
    totalCredit: dec(r.totalCredit),
    totalReturns: dec(r.totalReturns),
    isSettled: bool(r.isSettled),
    settledAt: dt(r.settledAt),
    settledBy: r.settledBy,
    settlementNotes: r.settlementNotes,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.vanLoad);

  await copyTable("VanLoadItem", db, (r) => ({
    id: r.id,
    vanLoadId: r.vanLoadId,
    productId: r.productId,
    loadedQty: r.loadedQty,
    soldQty: r.soldQty,
    returnedQty: r.returnedQty,
    damagedQty: r.damagedQty,
    unitPrice: dec(r.unitPrice),
  }), prisma.vanLoadItem);

  await copyTable("VanSale", db, (r) => ({
    id: r.id,
    vanLoadId: r.vanLoadId,
    customerId: r.customerId,
    invoiceId: r.invoiceId,
    amount: dec(r.amount),
    paymentMode: r.paymentMode,
    lat: r.lat,
    lng: r.lng,
    items: r.items,
    createdAt: dt(r.createdAt),
  }), prisma.vanSale);

  console.log("Step 11: assets, photos, attendance, payroll");
  await copyTable("Asset", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    assetType: r.assetType,
    name: r.name,
    description: r.description,
    serialNumber: r.serialNumber,
    purchaseValue: dec(r.purchaseValue),
    currentValue: dec(r.currentValue),
    purchaseDate: dt(r.purchaseDate),
    depreciationRate: dec(r.depreciationRate),
    location: r.location,
    status: r.status,
    assignedTo: r.assignedTo,
    maintenanceNotes: r.maintenanceNotes,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.asset);

  await copyTable("Photo", db, (r) => ({
    id: r.id,
    url: r.url,
    timestamp: dt(r.timestamp),
    lat: r.lat,
    lng: r.lng,
    address: r.address,
    accuracy: r.accuracy,
    isMock: bool(r.isMock),
    stockSnapshot: r.stockSnapshot,
    userName: r.userName,
    userRole: r.userRole,
    companyId: cidFor(r),
    companyName: r.companyName,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.photo);

  await copyTable("Attendance", db, (r) => ({
    id: r.id,
    employeeId: r.employeeId,
    date: dt(r.date),
    status: r.status,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    overtimeHours: r.overtimeHours,
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.attendance);

  await copyTable("Payroll", db, (r) => ({
    id: r.id,
    employeeId: r.employeeId,
    month: r.month,
    year: r.year,
    baseSalary: dec(r.baseSalary),
    attendanceDays: r.attendanceDays,
    earnedSalary: dec(r.earnedSalary),
    bonus: dec(r.bonus),
    incentives: dec(r.incentives),
    deductions: dec(r.deductions),
    netSalary: dec(r.netSalary),
    status: r.status,
    paymentDate: dt(r.paymentDate),
    createdAt: dt(r.createdAt),
    updatedAt: dt(r.updatedAt),
  }), prisma.payroll);

  console.log("Step 12: ca + eway logs");
  await copyTable("CAAuditLog", db, (r) => ({
    id: r.id,
    companyId: cidFor(r),
    companyName: r.companyName,
    caUserEmail: r.caUserEmail,
    action: r.action,
    details: r.details,
    createdAt: dt(r.createdAt),
  }), prisma.cAAuditLog);

  await copyTable("CAInviteToken", db, (r) => ({
    id: r.id,
    email: r.email,
    companyId: cidFor(r),
    companyName: r.companyName,
    token: r.token,
    expiresAt: dt(r.expiresAt),
    usedAt: dt(r.usedAt),
    createdAt: dt(r.createdAt),
  }), prisma.cAInviteToken);

  await copyTable("EWayAuditLog", db, (r) => ({
    id: r.id,
    companyId: r.companyId,
    action: r.action,
    status: r.status,
    message: r.message,
    provider: r.provider,
    createdAt: dt(r.createdAt),
  }), prisma.eWayAuditLog);

  // ?? Verification ?????????????????????????????????????????????????????????
  console.log("\nVerification");
  const tables = [
    "Company",
    "Employee",
    "User",
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
    "Beat",
    "BeatCustomer",
    "Visit",
    "Scheme",
    "OrderScheme",
    "CustomerCredit",
    "CreditLimitAction",
    "Payment",
    "PaymentReminder",
    "ReminderTemplate",
    "SalesReturn",
    "ReturnItem",
    "CreditNote",
    "VanLoad",
    "VanLoadItem",
    "VanSale",
    "Asset",
    "Photo",
    "Attendance",
    "Payroll",
    "CAAuditLog",
    "CAInviteToken",
    "EWayAuditLog",
  ];

  for (const t of tables) {
    const sqliteCount = tableExists(db, t)
      ? db.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get().c
      : 0;
    const modelKey = t.charAt(0).toLowerCase() + t.slice(1);
    const pgCount = await prisma[modelKey].count();
    const status = sqliteCount === pgCount ? "OK" : "DIFF";
    console.log(`  ${t.padEnd(20)} sqlite=${sqliteCount} postgres=${pgCount} [${status}]`);
  }

  if (tableExists(db, "Invoice")) {
    const sqliteSum =
      db.prepare("SELECT COALESCE(SUM(totalAmount), 0) AS s FROM Invoice").get().s || 0;
    const pgAgg = await prisma.invoice.aggregate({ _sum: { totalAmount: true } });
    const pgSum = pgAgg._sum.totalAmount?.toString() || "0";
    console.log(`\nInvoice total amount sqlite=${sqliteSum} postgres=${pgSum}`);
  }

  db.close();
  console.log("\nCutover complete.");
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
