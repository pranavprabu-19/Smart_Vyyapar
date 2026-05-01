-- AlterTable
ALTER TABLE "User" ADD COLUMN "companyName" TEXT;
ALTER TABLE "User" ADD COLUMN "employeeId" TEXT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "aadhaar" TEXT,
    "pan" TEXT,
    "salaryType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "baseSalary" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joiningDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "checkIn" TEXT,
    "checkOut" TEXT,
    "overtimeHours" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL DEFAULT 'Sai Associates',
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "price" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 10,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 50,
    "supplierEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL DEFAULT 'Sai Associates',
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "gstin" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "lat" REAL,
    "lng" REAL,
    "mapLink" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "lastInvoiceNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "bankName" TEXT,
    "accountNo" TEXT,
    "ifscCode" TEXT,
    "branch" TEXT,
    "logoUrl" TEXT,
    "signatureUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerId" TEXT,
    "employeeId" TEXT,
    "totalAmount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "customerDetails" TEXT NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("billingAddress", "companyName", "createdAt", "customerDetails", "customerName", "date", "id", "invoiceNo", "paymentMode", "status", "totalAmount", "updatedAt") SELECT "billingAddress", "companyName", "createdAt", "customerDetails", "customerName", "date", "id", "invoiceNo", "paymentMode", "status", "totalAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyName_employeeId_key" ON "Employee"("companyName", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_gstin_key" ON "Customer"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");
