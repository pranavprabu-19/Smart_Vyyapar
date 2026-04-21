export type EWayEnvironment = "SANDBOX" | "PRODUCTION";
export type EWayProviderCode = "CLEARTAX";

export interface EWayCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  gstin: string;
  environment: EWayEnvironment;
}

export interface EWayConnectionResult {
  success: boolean;
  message: string;
  timestamp: string;
  providerCode: EWayProviderCode;
}

export interface EWayTransportDetails {
  transportMode: "ROAD" | "RAIL" | "AIR" | "SHIP";
  vehicleNo: string;
  vehicleType?: "REGULAR" | "ODC";
  distanceKm: number;
}

export interface EWayBillItem {
  productName: string;
  hsnCode: string;
  quantity: number;
  taxableAmount: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
}

export interface EWayInvoicePayload {
  documentNumber: string;
  documentDate: string;
  sellerGstin: string;
  sellerTradeName: string;
  buyerGstin?: string;
  buyerName: string;
  buyerAddress: string;
  buyerStateCode?: string;
  totalValue: number;
  taxableValue: number;
  items: EWayBillItem[];
  transport: EWayTransportDetails;
}

export interface EWayGenerationResult {
  success: boolean;
  message: string;
  timestamp: string;
  providerCode: EWayProviderCode;
  ewayBillNumber?: string;
  validUpto?: string;
  rawResponse?: unknown;
}

export interface EWayProviderAdapter {
  testConnection(credentials: EWayCredentials): Promise<EWayConnectionResult>;
  generateEWayBill(
    credentials: EWayCredentials,
    payload: EWayInvoicePayload
  ): Promise<EWayGenerationResult>;
}
