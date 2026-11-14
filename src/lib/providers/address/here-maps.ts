import "server-only";
import type { AddressProvider, AddressSuggestion, PincodeLookupResult } from "./types";

interface HereAddress {
  street?: string;
  district?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryName?: string;
  countryCode?: string;
}

interface HereItem {
  title: string;
  address: HereAddress;
  position?: { lat: number; lng: number };
}

/**
 * HERE Geocoding & Search API v7 — single geocode endpoint covers both
 * free-text search and pincode lookup, unlike Google's two-step
 * autocomplete+resolve flow. Requires HERE_API_KEY (simple key-based
 * auth, no OAuth). isConfigured() returns false without one.
 *
 * Endpoint/param structure matches HERE's published API docs, not
 * verified against a live key in this environment.
 */
class HereMapsProvider implements AddressProvider {
  key = "here";

  private get apiKey(): string | undefined {
    return process.env.HERE_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async geocode(query: string, countryCode?: string): Promise<AddressSuggestion[]> {
    if (!this.isConfigured()) return [];

    try {
      const url = new URL("https://geocode.search.hereapi.com/v1/geocode");
      url.searchParams.set("q", query);
      url.searchParams.set("apiKey", this.apiKey!);
      url.searchParams.set("limit", "8");
      if (countryCode) url.searchParams.set("in", `countryCode:${countryCode.toUpperCase()}`);

      const res = await fetch(url.toString());
      if (!res.ok) return [];

      const json = (await res.json()) as { items?: HereItem[] };
      return (json.items ?? [])
        .map((item): AddressSuggestion | null => {
          const a = item.address;
          if (!a.city || !a.state || !a.countryName) return null;
          return {
            label: item.title,
            line1: [a.street, a.district].filter(Boolean).join(", ") || a.city,
            city: a.city,
            state: a.state,
            pincode: a.postalCode,
            country: a.countryName,
            countryCode: a.countryCode?.slice(0, 2).toUpperCase(),
            lat: item.position?.lat,
            lng: item.position?.lng,
          };
        })
        .filter((s): s is AddressSuggestion => s !== null);
    } catch {
      return [];
    }
  }

  async search(query: string, countryCode?: string): Promise<AddressSuggestion[]> {
    if (query.trim().length < 3) return [];
    return this.geocode(query.trim(), countryCode);
  }

  async lookupPincode(pincode: string, countryCode?: string): Promise<PincodeLookupResult | null> {
    const results = await this.geocode(pincode, countryCode);
    const first = results[0];
    if (!first) return null;
    return { city: first.city, state: first.state, country: first.country, countryCode: first.countryCode };
  }
}

let provider: HereMapsProvider | null = null;

export function getHereMapsProvider(): AddressProvider {
  if (!provider) provider = new HereMapsProvider();
  return provider;
}
