import "server-only";
import type { AddressProvider, AddressSuggestion, PincodeLookupResult } from "./types";

interface IndiaPostOffice {
  District: string;
  State: string;
}

interface IndiaPostResponse {
  Status: string;
  PostOffice: IndiaPostOffice[] | null;
}

/**
 * India-specific pincode lookup — free, keyless, more authoritative than
 * Nominatim for Indian PIN codes specifically. Does NOT implement
 * search() (India Post has no locality-search API) — the registry falls
 * back to Nominatim for search even when this provider handles pincode
 * lookup. Only ever selected by the registry when countryCode === "IN".
 */
class IndiaPostProvider implements AddressProvider {
  key = "india_post";

  isConfigured(): boolean {
    return true;
  }

  async search(): Promise<AddressSuggestion[]> {
    return [];
  }

  async lookupPincode(pincode: string): Promise<PincodeLookupResult | null> {
    if (!/^\d{6}$/.test(pincode)) return null;

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        next: { revalidate: 60 * 60 * 24 * 30 },
      });
      if (!res.ok) return null;

      const data = (await res.json()) as IndiaPostResponse[];
      const result = data?.[0];
      if (result?.Status !== "Success" || !result.PostOffice?.length) return null;

      const office = result.PostOffice[0];
      return { city: office.District, state: office.State, country: "India", countryCode: "IN" };
    } catch {
      return null;
    }
  }
}

let provider: IndiaPostProvider | null = null;

export function getIndiaPostProvider(): AddressProvider {
  if (!provider) provider = new IndiaPostProvider();
  return provider;
}
