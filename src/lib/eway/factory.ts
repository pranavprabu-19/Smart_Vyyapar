import type { EWayProviderAdapter } from "@/lib/eway/adapter";
import { ClearTaxEWayProvider } from "@/lib/eway/providers/cleartax";

export function getEWayProvider(provider: "CLEARTAX"): EWayProviderAdapter {
  if (provider === "CLEARTAX") {
    return new ClearTaxEWayProvider();
  }
  throw new Error(`Unsupported E-Way provider: ${provider}`);
}
