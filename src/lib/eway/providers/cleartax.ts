import {
  EWayConnectionResult,
  EWayCredentials,
  EWayGenerationResult,
  EWayInvoicePayload,
  EWayProviderAdapter,
} from "@/lib/eway/adapter";

const CLEARTAX_URLS = {
  SANDBOX: "https://api-sandbox.clear.in",
  PRODUCTION: "https://api.clear.in",
} as const;

export class ClearTaxEWayProvider implements EWayProviderAdapter {
  async testConnection(credentials: EWayCredentials): Promise<EWayConnectionResult> {
    const baseUrl = CLEARTAX_URLS[credentials.environment];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${baseUrl}/gst/compliance/taxpayer/${credentials.gstin}`, {
        method: "GET",
        headers: {
          "x-cleartax-auth-token": credentials.clientSecret,
          "x-cleartax-product": "EWAYBILL",
          "x-cleartax-user-id": credentials.username,
          "x-cleartax-gstin": credentials.gstin,
          "x-cleartax-client-id": credentials.clientId,
          "x-cleartax-client-secret": credentials.clientSecret,
        },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text();
        return {
          success: false,
          message: `ClearTax auth failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
          timestamp: new Date().toISOString(),
          providerCode: "CLEARTAX",
        };
      }

      return {
        success: true,
        message: "ClearTax connection verified successfully.",
        timestamp: new Date().toISOString(),
        providerCode: "CLEARTAX",
      };
    } catch (error: any) {
      const isTimeout = error?.name === "AbortError";
      return {
        success: false,
        message: isTimeout
          ? "ClearTax connection timed out. Please check network/API availability."
          : `ClearTax connection failed: ${error?.message || "Unknown error"}`,
        timestamp: new Date().toISOString(),
        providerCode: "CLEARTAX",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateEWayBill(
    credentials: EWayCredentials,
    payload: EWayInvoicePayload
  ): Promise<EWayGenerationResult> {
    const baseUrl = CLEARTAX_URLS[credentials.environment];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const generatePath = process.env.CLEARTAX_EWAY_GENERATE_PATH || "/gst/ewaybill/v1/generate";

    try {
      const res = await fetch(`${baseUrl}${generatePath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cleartax-auth-token": credentials.clientSecret,
          "x-cleartax-product": "EWAYBILL",
          "x-cleartax-user-id": credentials.username,
          "x-cleartax-gstin": credentials.gstin,
          "x-cleartax-client-id": credentials.clientId,
          "x-cleartax-client-secret": credentials.clientSecret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store",
      });

      const rawBody = await res.text();
      let parsedBody: unknown = rawBody;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        // keep text body for diagnostics
      }

      if (!res.ok) {
        return {
          success: false,
          message: `ClearTax generation failed (${res.status})`,
          timestamp: new Date().toISOString(),
          providerCode: "CLEARTAX",
          rawResponse: parsedBody,
        };
      }

      const data = parsedBody as Record<string, any>;
      return {
        success: true,
        message: "E-Way bill generated successfully.",
        timestamp: new Date().toISOString(),
        providerCode: "CLEARTAX",
        ewayBillNumber: data?.ewayBillNo || data?.ewaybill_number || data?.ewbNo,
        validUpto: data?.validUpto || data?.valid_upto,
        rawResponse: data,
      };
    } catch (error: any) {
      const isTimeout = error?.name === "AbortError";
      return {
        success: false,
        message: isTimeout
          ? "ClearTax generation timed out."
          : `ClearTax generation error: ${error?.message || "Unknown error"}`,
        timestamp: new Date().toISOString(),
        providerCode: "CLEARTAX",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
