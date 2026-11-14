import "server-only";
import { getCountryByCode } from "@/lib/config/countries";
import type { AddressProvider, AddressSuggestion, PincodeLookupResult } from "./types";

interface NominatimAddress {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  hamlet?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  display_name: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

/**
 * Fallback provider — free, keyless, always configured. Genuinely
 * country-generic (no hardcoded "India" — the country filter/context text
 * is derived from whichever countryCode is passed in, defaulting to
 * nothing/global if none given).
 *
 * Real, structural limitation, not a bug: OSM's dataset is
 * community-contributed and uneven for small/informal localities outside
 * major cities, especially in India. A paid provider (Google Places,
 * MapMyIndia, HERE, LocationIQ) genuinely has better coverage — this
 * class is the safety net when no paid provider is configured, not a
 * claim of equivalent quality.
 */
class NominatimProvider implements AddressProvider {
  key = "nominatim";

  isConfigured(): boolean {
    return true;
  }

  async search(query: string, countryCode?: string): Promise<AddressSuggestion[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    const country = countryCode ? getCountryByCode(countryCode) : undefined;

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", country ? `${trimmed}, ${country.name}` : trimmed);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      if (country) url.searchParams.set("countrycodes", country.code.toLowerCase());
      url.searchParams.set("limit", "8");
      url.searchParams.set("dedupe", "1");

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "Elysia-HomeDecor/1.0 (address-autocomplete)" },
        next: { revalidate: 60 * 60 },
      });
      if (!res.ok) return [];

      const results = (await res.json()) as NominatimResult[];

      return results
        .map((r): AddressSuggestion | null => {
          const addr = r.address;
          const city = addr?.city || addr?.town || addr?.village || addr?.suburb || addr?.hamlet;
          if (!addr || !city || !addr.state || !addr.country) return null;
          const line1 =
            [addr.road, addr.suburb || addr.neighbourhood || addr.hamlet].filter(Boolean).join(", ") || city;
          return {
            label: r.display_name,
            line1,
            city,
            state: addr.state,
            pincode: addr.postcode,
            country: addr.country,
            countryCode: addr.country_code?.toUpperCase(),
            lat: r.lat ? parseFloat(r.lat) : undefined,
            lng: r.lon ? parseFloat(r.lon) : undefined,
          };
        })
        .filter((s): s is AddressSuggestion => s !== null);
    } catch {
      return [];
    }
  }

  async lookupPincode(pincode: string, countryCode?: string): Promise<PincodeLookupResult | null> {
    const country = countryCode ? getCountryByCode(countryCode) : undefined;

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("postalcode", pincode);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      if (country) url.searchParams.set("countrycodes", country.code.toLowerCase());
      url.searchParams.set("limit", "1");

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "Elysia-HomeDecor/1.0 (address-autocomplete)" },
        next: { revalidate: 60 * 60 * 24 * 30 },
      });
      if (!res.ok) return null;

      const results = (await res.json()) as NominatimResult[];
      const addr = results[0]?.address;
      const city = addr?.city || addr?.town || addr?.village;
      if (!addr || !city || !addr.state || !addr.country) return null;

      return { city, state: addr.state, country: addr.country, countryCode: addr.country_code?.toUpperCase() };
    } catch {
      return null;
    }
  }
}

let provider: NominatimProvider | null = null;

export function getNominatimProvider(): AddressProvider {
  if (!provider) provider = new NominatimProvider();
  return provider;
}
