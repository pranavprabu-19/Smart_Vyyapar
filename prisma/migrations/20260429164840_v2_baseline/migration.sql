-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
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
    "whatsappApiKey" TEXT,
    "whatsappPhoneId" TEXT,
    "invoiceTemplateId" TEXT,
    "emailSmtpHost" TEXT,
    "emailUser" TEXT,
    "emailPassword" TEXT,
    "ewayProvider" TEXT,
    "ewayEnvironment" TEXT NOT NULL DEFAULT 'SANDBOX',
    "ewayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ewayClientId" TEXT,
    "ewayClientSecret" TEXT,
    "ewayUsername" TEXT,
    "ewayPassword" TEXT,
    "ewayGstin" TEXT,
    "ewayCredentialUpdatedAt" TIMESTAMP(3),
    "ewayLastTestedAt" TIMESTAMP(3),
    "ewayLastTestStatus" TEXT,
    "ewayLastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerId" TEXT,
    "employeeId" TEXT,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "dueDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "customerDetails" JSONB NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "costPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "hsn" TEXT,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "companyName" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
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
    "baseSalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "checkIn" TEXT,
    "checkOut" TEXT,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "attendanceDays" DOUBLE PRECISION NOT NULL,
    "earnedSalary" DECIMAL(14,2) NOT NULL,
    "bonus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "incentives" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Sai Associates',
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "price" DECIMAL(14,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 10,
    "costPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 50,
    "supplierEmail" TEXT,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "isLiquidationCandidate" BOOLEAN NOT NULL DEFAULT false,
    "liquidationFlaggedAt" TIMESTAMP(3),
    "liquidationReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Godown" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "manager" TEXT,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Godown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "godownId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Sai Associates',
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "gstin" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "mapLink" TEXT,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lastInvoiceNo" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EWayAuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EWayAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Sai Associates',
    "driverName" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "vehicleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "startLocation" JSONB,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "foodCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherExp" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "allowance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "startReading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endReading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "timestamp" TIMESTAMP(3),
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "regNo" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "fuelType" TEXT,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastServiceDate" TIMESTAMP(3),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "accuracy" DOUBLE PRECISION,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "stockSnapshot" JSONB,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beat" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeatCustomer" (
    "id" TEXT NOT NULL,
    "beatId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeatCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "beatId" TEXT,
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "checkInLat" DOUBLE PRECISION NOT NULL,
    "checkInLng" DOUBLE PRECISION NOT NULL,
    "checkOutTime" TIMESTAMP(3),
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLng" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "photoIds" JSONB,
    "orderId" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "schemeDiscount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveryNotes" TEXT,
    "invoiceId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "minQuantity" INTEGER,
    "minAmount" DECIMAL(14,2),
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "discountPercent" DECIMAL(5,2),
    "discountAmount" DECIMAL(14,2),
    "freeProductId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableProducts" JSONB,
    "applicableCustomers" JSONB,
    "customerTiers" JSONB,
    "applicableCategories" JSONB,
    "budget" DECIMAL(14,2),
    "usedBudget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "maxUsagePerCustomer" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderScheme" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,

    CONSTRAINT "OrderScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCredit" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "availableCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lastPaymentDate" TIMESTAMP(3),
    "lastPaymentAmount" DECIMAL(14,2),
    "creditDays" INTEGER NOT NULL DEFAULT 30,
    "tier" TEXT NOT NULL DEFAULT 'C',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLimitAction" (
    "id" TEXT NOT NULL,
    "customerCreditId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "previousLimit" DECIMAL(14,2) NOT NULL,
    "newLimit" DECIMAL(14,2) NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "policyAction" TEXT NOT NULL,
    "reason" TEXT,
    "notificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLimitAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "paymentNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "chequeNo" TEXT,
    "chequeDate" TIMESTAMP(3),
    "bankName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "collectedBy" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "dueAmount" DECIMAL(14,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "messageText" TEXT,
    "channel" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "reminderType" TEXT NOT NULL DEFAULT 'FIRST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "triggerDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "returnNo" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "stockAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "reason" TEXT,
    "condition" TEXT,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "creditNoteNo" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "returnId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "usedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "usedInInvoiceId" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VanLoad" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "loadNo" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOADING',
    "loadedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "plannedRoute" JSONB,
    "actualRoute" JSONB,
    "totalLoaded" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalSold" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCash" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalReturns" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "settledBy" TEXT,
    "settlementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VanLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VanLoadItem" (
    "id" TEXT NOT NULL,
    "vanLoadId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "loadedQty" INTEGER NOT NULL,
    "soldQty" INTEGER NOT NULL DEFAULT 0,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "VanLoadItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VanSale" (
    "id" TEXT NOT NULL,
    "vanLoadId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "items" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VanSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serialNumber" TEXT,
    "purchaseValue" DECIMAL(14,2) NOT NULL,
    "currentValue" DECIMAL(14,2) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "depreciationRate" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedTo" TEXT,
    "maintenanceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CAAuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "caUserEmail" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CAAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CAInviteToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CAInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "actor" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Invoice_companyId_date_idx" ON "Invoice"("companyId", "date");

-- CreateIndex
CREATE INDEX "Invoice_companyId_status_dueDate_idx" ON "Invoice"("companyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_companyId_deletedAt_idx" ON "Invoice"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNo_key" ON "Invoice"("companyId", "invoiceNo");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "Employee_companyId_status_idx" ON "Employee"("companyId", "status");

-- CreateIndex
CREATE INDEX "Employee_companyId_deletedAt_idx" ON "Employee"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_employeeId_key" ON "Employee"("companyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_year_idx" ON "Payroll"("employeeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_employeeId_month_key" ON "Payroll"("employeeId", "month");

-- CreateIndex
CREATE INDEX "Product_companyId_category_idx" ON "Product"("companyId", "category");

-- CreateIndex
CREATE INDEX "Product_companyId_deletedAt_idx" ON "Product"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Godown_companyId_name_key" ON "Godown"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_productId_godownId_key" ON "Stock"("productId", "godownId");

-- CreateIndex
CREATE INDEX "Customer_companyId_phone_idx" ON "Customer"("companyId", "phone");

-- CreateIndex
CREATE INDEX "Customer_companyId_deletedAt_idx" ON "Customer"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_gstin_key" ON "Customer"("companyId", "gstin");

-- CreateIndex
CREATE INDEX "EWayAuditLog_companyId_createdAt_idx" ON "EWayAuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Trip_companyId_status_idx" ON "Trip"("companyId", "status");

-- CreateIndex
CREATE INDEX "Trip_companyId_createdAt_idx" ON "Trip"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_regNo_key" ON "Vehicle"("regNo");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_status_idx" ON "Vehicle"("companyId", "status");

-- CreateIndex
CREATE INDEX "Photo_companyId_timestamp_idx" ON "Photo"("companyId", "timestamp");

-- CreateIndex
CREATE INDEX "Beat_companyId_employeeId_idx" ON "Beat"("companyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Beat_companyId_name_dayOfWeek_key" ON "Beat"("companyId", "name", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "BeatCustomer_beatId_customerId_key" ON "BeatCustomer"("beatId", "customerId");

-- CreateIndex
CREATE INDEX "Visit_companyId_employeeId_checkInTime_idx" ON "Visit"("companyId", "employeeId", "checkInTime");

-- CreateIndex
CREATE INDEX "Visit_customerId_idx" ON "Visit"("customerId");

-- CreateIndex
CREATE INDEX "Order_companyId_status_createdAt_idx" ON "Order"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_companyId_deletedAt_idx" ON "Order"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_companyId_orderNo_key" ON "Order"("companyId", "orderNo");

-- CreateIndex
CREATE INDEX "Scheme_companyId_isActive_endDate_idx" ON "Scheme"("companyId", "isActive", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_companyId_name_key" ON "Scheme"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCredit_customerId_key" ON "CustomerCredit"("customerId");

-- CreateIndex
CREATE INDEX "CreditLimitAction_companyId_createdAt_idx" ON "CreditLimitAction"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_companyId_customerId_collectedAt_idx" ON "Payment"("companyId", "customerId", "collectedAt");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_companyId_paymentNo_key" ON "Payment"("companyId", "paymentNo");

-- CreateIndex
CREATE INDEX "PaymentReminder_companyId_status_dueDate_idx" ON "PaymentReminder"("companyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "PaymentReminder_customerId_idx" ON "PaymentReminder"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderTemplate_companyId_name_key" ON "ReminderTemplate"("companyId", "name");

-- CreateIndex
CREATE INDEX "SalesReturn_companyId_status_idx" ON "SalesReturn"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReturn_companyId_returnNo_key" ON "SalesReturn"("companyId", "returnNo");

-- CreateIndex
CREATE INDEX "CreditNote_companyId_status_idx" ON "CreditNote"("companyId", "status");

-- CreateIndex
CREATE INDEX "CreditNote_customerId_idx" ON "CreditNote"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_companyId_creditNoteNo_key" ON "CreditNote"("companyId", "creditNoteNo");

-- CreateIndex
CREATE INDEX "VanLoad_companyId_status_idx" ON "VanLoad"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VanLoad_companyId_loadNo_key" ON "VanLoad"("companyId", "loadNo");

-- CreateIndex
CREATE INDEX "VanSale_vanLoadId_idx" ON "VanSale"("vanLoadId");

-- CreateIndex
CREATE INDEX "Asset_companyId_idx" ON "Asset"("companyId");

-- CreateIndex
CREATE INDEX "Asset_companyId_status_idx" ON "Asset"("companyId", "status");

-- CreateIndex
CREATE INDEX "CAAuditLog_companyId_createdAt_idx" ON "CAAuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CAInviteToken_token_key" ON "CAInviteToken"("token");

-- CreateIndex
CREATE INDEX "CAInviteToken_email_companyId_idx" ON "CAInviteToken"("email", "companyId");

-- CreateIndex
CREATE INDEX "CAInviteToken_expiresAt_idx" ON "CAInviteToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_entity_entityId_idx" ON "AuditLog"("companyId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Godown" ADD CONSTRAINT "Godown_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "Godown"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EWayAuditLog" ADD CONSTRAINT "EWayAuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beat" ADD CONSTRAINT "Beat_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beat" ADD CONSTRAINT "Beat_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeatCustomer" ADD CONSTRAINT "BeatCustomer_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "Beat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeatCustomer" ADD CONSTRAINT "BeatCustomer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "Beat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderScheme" ADD CONSTRAINT "OrderScheme_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderScheme" ADD CONSTRAINT "OrderScheme_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCredit" ADD CONSTRAINT "CustomerCredit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLimitAction" ADD CONSTRAINT "CreditLimitAction_customerCreditId_fkey" FOREIGN KEY ("customerCreditId") REFERENCES "CustomerCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLimitAction" ADD CONSTRAINT "CreditLimitAction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderTemplate" ADD CONSTRAINT "ReminderTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SalesReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_usedInInvoiceId_fkey" FOREIGN KEY ("usedInInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanLoad" ADD CONSTRAINT "VanLoad_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanLoad" ADD CONSTRAINT "VanLoad_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanLoad" ADD CONSTRAINT "VanLoad_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanLoadItem" ADD CONSTRAINT "VanLoadItem_vanLoadId_fkey" FOREIGN KEY ("vanLoadId") REFERENCES "VanLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanLoadItem" ADD CONSTRAINT "VanLoadItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanSale" ADD CONSTRAINT "VanSale_vanLoadId_fkey" FOREIGN KEY ("vanLoadId") REFERENCES "VanLoad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanSale" ADD CONSTRAINT "VanSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAAuditLog" ADD CONSTRAINT "CAAuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAInviteToken" ADD CONSTRAINT "CAInviteToken_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
