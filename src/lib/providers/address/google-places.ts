import "server-only";
import { getCountryByCode } from "@/lib/config/countries";
import type { AddressProvider, AddressSuggestion, PincodeLookupResult } from "./types";

interface PlacesAutocompletePrediction {
  place_id: string;
  description: string;
}

interface GeocodeAddressComponent {
  long_name: string;
  types: string[];
}

interface GeocodeResult {
  formatted_address: string;
  address_components: GeocodeAddressComponent[];
  geometry?: { location: { lat: number; lng: number } };
}

function component(components: GeocodeAddressComponent[], type: string): string | undefined {
  return components.find((c) => c.types.includes(type))?.long_name;
}

/**
 * Google Places (Autocomplete for search, Geocoding API for pincode
 * lookup and to resolve a selected prediction's place_id into full
 * address components + lat/lng). Requires GOOGLE_PLACES_API_KEY.
 * isConfigured() returns false without one — the registry skips this
 * provider entirely rather than calling it and failing.
 *
 * Endpoint/param structure matches Google's published Places/Geocoding
 * API docs, but this has not been exercised against a live key in this
 * environment — flagging that rather than claiming verified behavior.
 */
class GooglePlacesProvider implements AddressProvider {
  key = "google_places";

  private get apiKey(): string | undefined {
    return process.env.GOOGLE_PLACES_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, countryCode?: string): Promise<AddressSuggestion[]> {
    if (!this.isConfigured() || query.trim().length < 3) return [];

    try {
      const autoUrl = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      autoUrl.searchParams.set("input", query.trim());
      autoUrl.searchParams.set("key", this.apiKey!);
      if (countryCode) autoUrl.searchParams.set("components", `country:${countryCode.toLowerCase()}`);

      const autoRes = await fetch(autoUrl.toString());
      if (!autoRes.ok) return [];
      const autoJson = (await autoRes.json()) as { predictions?: PlacesAutocompletePrediction[] };
      const predictions = autoJson.predictions?.slice(0, 6) ?? [];

      // Resolve each prediction to full address components + lat/lng via
      // Geocoding — doubles as the same call lookupPincode() needs,
      // keeping the provider small (a real implementation might prefer
      // Place Details here instead, which is cheaper per-call).
      const resolved = await Promise.all(predictions.map((p) => this.geocode(`place_id:${p.place_id}`)));
      return resolved.filter((s): s is AddressSuggestion => s !== null);
    } catch {
      return [];
    }
  }

  async lookupPincode(pincode: string, countryCode?: string): Promise<PincodeLookupResult | null> {
    const country = countryCode ? getCountryByCode(countryCode) : undefined;
    const query = country ? `${pincode}, ${country.name}` : pincode;
    const result = await this.geocode(query);
    if (!result) return null;
    return { city: result.city, state: result.state, country: result.country, countryCode: result.countryCode };
  }

  private async geocode(addressOrPlaceId: string): Promise<AddressSuggestion | null> {
    if (!this.isConfigured()) return null;

    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      if (addressOrPlaceId.startsWith("place_id:")) {
        url.searchParams.set("place_id", addressOrPlaceId.replace("place_id:", ""));
      } else {
        url.searchParams.set("address", addressOrPlaceId);
      }
      url.searchParams.set("key", this.apiKey!);

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const json = (await res.json()) as { results?: GeocodeResult[] };
      const result = json.results?.[0];
      if (!result) return null;

      const comps = result.address_components;
      const city = component(comps, "locality") || component(comps, "administrative_area_level_2");
      const state = component(comps, "administrative_area_level_1");
      const country = component(comps, "country");
      const countryCode = comps.find((c) => c.types.includes("country"))?.long_name;
      const pincode = component(comps, "postal_code");
      const streetNumber = component(comps, "street_number");
      const route = component(comps, "route");
      if (!city || !state || !country) return null;

      return {
        label: result.formatted_address,
        line1: [streetNumber, route].filter(Boolean).join(" ") || city,
        city,
        state,
        pincode,
        country,
        countryCode: countryCode?.slice(0, 2).toUpperCase(),
        lat: result.geometry?.location.lat,
        lng: result.geometry?.location.lng,
      };
    } catch {
      return null;
    }
  }
}

let provider: GooglePlacesProvider | null = null;

export function getGooglePlacesProvider(): AddressProvider {
  if (!provider) provider = new GooglePlacesProvider();
  return provider;
}
