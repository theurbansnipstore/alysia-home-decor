import "server-only";
import { getCountryByCode } from "@/lib/config/countries";
import type { AddressProvider, AddressSuggestion, PincodeLookupResult } from "./types";

interface LocationIqAddress {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface LocationIqResult {
  display_name: string;
  lat?: string;
  lon?: string;
  address?: LocationIqAddress;
}

/**
 * LocationIQ — Nominatim-compatible response shape, paid tiers with far
 * better rate limits/reliability than free Nominatim. Requires
 * LOCATIONIQ_API_KEY. isConfigured() returns false without one, so the
 * registry skips this provider rather than calling it and failing.
 *
 * Not verified against a live key in this environment — the endpoint/
 * param structure matches LocationIQ's published API docs, but I can't
 * confirm behavior without a real key to test against.
 */
class LocationIqProvider implements AddressProvider {
  key = "locationiq";

  private get apiKey(): string | undefined {
    return process.env.LOCATIONIQ_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, countryCode?: string): Promise<AddressSuggestion[]> {
    if (!this.isConfigured() || query.trim().length < 3) return [];
    const country = countryCode ? getCountryByCode(countryCode) : undefined;

    try {
      const url = new URL("https://us1.locationiq.com/v1/search");
      url.searchParams.set("key", this.apiKey!);
      url.searchParams.set("q", query.trim());
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      if (country) url.searchParams.set("countrycodes", country.code.toLowerCase());
      url.searchParams.set("limit", "8");

      const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 } });
      if (!res.ok) return [];

      const results = (await res.json()) as LocationIqResult[];
      return results
        .map((r): AddressSuggestion | null => {
          const addr = r.address;
          const city = addr?.city || addr?.town || addr?.village || addr?.suburb;
          if (!addr || !city || !addr.state || !addr.country) return null;
          return {
            label: r.display_name,
            line1: [addr.road, addr.suburb || addr.neighbourhood].filter(Boolean).join(", ") || city,
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
    const results = await this.search(pincode, countryCode);
    const first = results[0];
    if (!first) return null;
    return { city: first.city, state: first.state, country: first.country, countryCode: first.countryCode };
  }
}

let provider: LocationIqProvider | null = null;

export function getLocationIqProvider(): AddressProvider {
  if (!provider) provider = new LocationIqProvider();
  return provider;
}
