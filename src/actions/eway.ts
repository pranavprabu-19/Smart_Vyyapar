"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getEWayProvider } from "@/lib/eway/factory";
import type { EWayCredentials, EWayInvoicePayload, EWayTransportDetails } from "@/lib/eway/adapter";

const MASK = "••••••••";
const PROVIDER = "CLEARTAX" as const;
type EWayEnvironment = "SANDBOX" | "PRODUCTION";
type EWayStatus = "SUCCESS" | "FAILED";

function isValidGstin(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(gstin);
}

function validateRequiredFields(input: SaveEWaySettingsInput) {
  const errors: string[] = [];
  if (!input.clientId?.trim()) errors.push("Client ID is required.");
  if (!input.clientSecret?.trim()) errors.push("Client Secret is required.");
  if (!input.username?.trim()) errors.push("Username is required.");
  if (!input.password?.trim()) errors.push("Password is required.");
  if (!input.gstin?.trim()) errors.push("GSTIN is required.");
  if (input.gstin && !isValidGstin(input.gstin)) errors.push("GSTIN format is invalid.");
  return errors;
}

function maskSecret(value?: string | null): string {
  return value ? MASK : "";
}

export interface SaveEWaySettingsInput {
  provider: "CLEARTAX";
  environment: EWayEnvironment;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  gstin: string;
}

export async function getEWaySettingsAction(companyName: string) {
  try {
    const company = await prisma.company.findUnique({
      where: { name: companyName },
      select: {
        id: true,
        name: true,
        ewayProvider: true,
        ewayEnvironment: true,
        ewayEnabled: true,
        ewayClientId: true,
        ewayClientSecret: true,
        ewayUsername: true,
        ewayPassword: true,
        ewayGstin: true,
        ewayCredentialUpdatedAt: true,
        ewayLastTestedAt: true,
        ewayLastTestStatus: true,
        ewayLastTestMessage: true,
      },
    });
    if (!company) return { success: false, error: "Company not found" };

    const logs = await prisma.eWayAuditLog.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        status: true,
        message: true,
        provider: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        ...company,
        ewayClientSecret: maskSecret(company.ewayClientSecret),
        ewayPassword: maskSecret(company.ewayPassword),
        ewayAuditLogs: logs,
      },
    };
  } catch (e) {
    console.error("Failed to fetch E-Way settings:", e);
    return { success: false, error: "Failed to fetch E-Way settings" };
  }
}

export async function saveEWaySettingsAction(companyName: string, input: SaveEWaySettingsInput) {
  try {
    const company = await prisma.company.findUnique({
      where: { name: companyName },
      select: { id: true, ewayClientSecret: true, ewayPassword: true },
    });
    if (!company) return { success: false, error: "Company not found" };

    const resolvedInput: SaveEWaySettingsInput = {
      ...input,
      clientSecret: input.clientSecret === MASK ? company.ewayClientSecret || "" : input.clientSecret,
      password: input.password === MASK ? company.ewayPassword || "" : input.password,
    };

    const validationErrors = validateRequiredFields(resolvedInput);
    if (validationErrors.length) {
      return { success: false, error: validationErrors.join(" ") };
    }

    await prisma.company.update({
      where: { id: company.id },
      data: {
        ewayProvider: resolvedInput.provider,
        ewayEnvironment: resolvedInput.environment,
        ewayEnabled: resolvedInput.enabled,
        ewayClientId: resolvedInput.clientId.trim(),
        ewayClientSecret: resolvedInput.clientSecret.trim(),
        ewayUsername: resolvedInput.username.trim(),
        ewayPassword: resolvedInput.password.trim(),
        ewayGstin: resolvedInput.gstin.trim().toUpperCase(),
        ewayCredentialUpdatedAt: new Date(),
      },
    });

    await prisma.eWayAuditLog.create({
      data: {
        companyId: company.id,
        action: "CREDENTIALS_UPDATED",
        status: "SUCCESS",
        message: `E-Way credentials updated for ${resolvedInput.provider}`,
        provider: resolvedInput.provider,
      },
    });

    revalidatePath("/dashboard/settings/eway");
    return { success: true };
  } catch (e) {
    console.error("Failed to save E-Way settings:", e);
    return { success: false, error: "Failed to save E-Way settings" };
  }
}

export async function testEWayConnectionAction(companyName: string) {
  try {
    const company = await prisma.company.findUnique({
      where: { name: companyName },
      select: {
        id: true,
        ewayProvider: true,
        ewayEnvironment: true,
        ewayClientId: true,
        ewayClientSecret: true,
        ewayUsername: true,
        ewayPassword: true,
        ewayGstin: true,
      },
    });
    if (!company) return { success: false, error: "Company not found" };
    if (company.ewayProvider && company.ewayProvider !== PROVIDER) {
      return { success: false, error: "Only ClearTax provider is supported." };
    }

    const credentials: EWayCredentials = {
      clientId: company.ewayClientId || "",
      clientSecret: company.ewayClientSecret || "",
      username: company.ewayUsername || "",
      password: company.ewayPassword || "",
      gstin: (company.ewayGstin || "").toUpperCase(),
      environment: (company.ewayEnvironment || "SANDBOX") as EWayEnvironment,
    };

    const validationErrors = validateRequiredFields({
      provider: PROVIDER,
      environment: credentials.environment,
      enabled: true,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      username: credentials.username,
      password: credentials.password,
      gstin: credentials.gstin,
    });
    if (validationErrors.length) {
      return { success: false, error: validationErrors.join(" ") };
    }

    const provider = getEWayProvider(PROVIDER);
    const result = await provider.testConnection(credentials);
    const status: EWayStatus = result.success ? "SUCCESS" : "FAILED";

    await prisma.company.update({
      where: { id: company.id },
      data: {
        ewayLastTestedAt: new Date(),
        ewayLastTestStatus: status,
        ewayLastTestMessage: result.message,
        ewayProvider: PROVIDER,
      },
    });

    await prisma.eWayAuditLog.create({
      data: {
        companyId: company.id,
        action: "TEST_CONNECTION",
        status,
        message: result.message,
        provider: PROVIDER,
      },
    });

    revalidatePath("/dashboard/settings/eway");
    return { success: result.success, message: result.message };
  } catch (e) {
    console.error("E-Way test connection failed:", e);
    return { success: false, error: "E-Way test connection failed" };
  }
}

export interface GenerateEWayBillInput {
  companyName: string;
  invoiceNo: string;
  transport: EWayTransportDetails;
}

function resolveStateCode(gstin?: string | null): string | undefined {
  if (!gstin || gstin.length < 2) return undefined;
  const code = gstin.slice(0, 2);
  return /^\d{2}$/.test(code) ? code : undefined;
}

export async function generateEWayBillAction(input: GenerateEWayBillInput) {
  try {
    const company = await prisma.company.findUnique({
      where: { name: input.companyName },
      select: {
        id: true,
        name: true,
        gstin: true,
        ewayProvider: true,
        ewayEnvironment: true,
        ewayEnabled: true,
        ewayClientId: true,
        ewayClientSecret: true,
        ewayUsername: true,
        ewayPassword: true,
        ewayGstin: true,
      },
    });
    if (!company) return { success: false, error: "Company not found." };
    if (!company.ewayEnabled) return { success: false, error: "E-Way integration is disabled for this company." };

    const invoice = await prisma.invoice.findFirst({
      where: { companyId: company.id, invoiceNo: input.invoiceNo },
      include: {
        items: true,
        customer: true,
      },
    });
    if (!invoice) return { success: false, error: "Invoice not found." };
    if (!invoice.items?.length) return { success: false, error: "Invoice has no line items." };

    const credentials: EWayCredentials = {
      clientId: company.ewayClientId || "",
      clientSecret: company.ewayClientSecret || "",
      username: company.ewayUsername || "",
      password: company.ewayPassword || "",
      gstin: (company.ewayGstin || company.gstin || "").toUpperCase(),
      environment: (company.ewayEnvironment || "SANDBOX") as EWayEnvironment,
    };

    const validationErrors = validateRequiredFields({
      provider: PROVIDER,
      environment: credentials.environment,
      enabled: true,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      username: credentials.username,
      password: credentials.password,
      gstin: credentials.gstin,
    });
    if (validationErrors.length) {
      return { success: false, error: validationErrors.join(" ") };
    }

    const taxableValue = invoice.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
    const payload: EWayInvoicePayload = {
      documentNumber: invoice.invoiceNo,
      documentDate: new Date(invoice.date).toISOString().split("T")[0],
      sellerGstin: credentials.gstin,
      sellerTradeName: company.name,
      buyerGstin: invoice.customer?.gstin || undefined,
      buyerName: invoice.customerName,
      buyerAddress: invoice.billingAddress || invoice.customer?.address || "",
      buyerStateCode: resolveStateCode(invoice.customer?.gstin),
      totalValue: Number(invoice.totalAmount),
      taxableValue,
      items: invoice.items.map((item) => {
        const gstRate = Number(item.gstRate ?? 0);
        return {
          productName: item.description,
          hsnCode: item.hsn || "0000",
          quantity: item.quantity,
          taxableAmount: Number((Number(item.price) * item.quantity).toFixed(2)),
          cgstRate: gstRate ? gstRate / 2 : 0,
          sgstRate: gstRate ? gstRate / 2 : 0,
        };
      }),
      transport: input.transport,
    };

    const provider = getEWayProvider(PROVIDER);
    const result = await provider.generateEWayBill(credentials, payload);
    const status: EWayStatus = result.success ? "SUCCESS" : "FAILED";

    await prisma.eWayAuditLog.create({
      data: {
        companyId: company.id,
        action: "GENERATE_EWAY_BILL",
        status,
        message: result.message,
        provider: PROVIDER,
      },
    });

    revalidatePath("/dashboard/settings/eway");
    return {
      success: result.success,
      message: result.message,
      ewayBillNumber: result.ewayBillNumber,
      validUpto: result.validUpto,
      payload,
      response: result.rawResponse,
    };
  } catch (e) {
    console.error("E-Way generation failed:", e);
    return { success: false, error: "E-Way generation failed." };
  }
}
