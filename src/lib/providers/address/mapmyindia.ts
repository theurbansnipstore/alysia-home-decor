import "server-only";
import type { AddressProvider, AddressSuggestion, PincodeLookupResult } from "./types";

interface MapplsSuggestion {
  placeName?: string;
  placeAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * MapMyIndia / Mappls — India-focused provider, generally the strongest
 * option for Indian addresses among the paid providers here. Requires
 * MAPMYINDIA_CLIENT_ID + MAPMYINDIA_CLIENT_SECRET (OAuth2
 * client-credentials flow — a token is fetched first, then used to call
 * the search API). isConfigured() returns false without both.
 *
 * Flagging this one as the LEAST certain of the four paid integrations:
 * Mappls has rebranded/restructured its API a few times (MapmyIndia →
 * Mappls), and I could not verify the current exact endpoint paths or
 * token flow against a live account in this environment. Treat the
 * endpoints below as a best-effort starting point to adjust against
 * Mappls's current API console/docs once you have real credentials,
 * not as verified-working code.
 */
class MapMyIndiaProvider implements AddressProvider {
  key = "mapmyindia";
  private cachedToken: { value: string; expiresAt: number } | null = null;

  private get clientId(): string | undefined {
    return process.env.MAPMYINDIA_CLIENT_ID;
  }
  private get clientSecret(): string | undefined {
    return process.env.MAPMYINDIA_CLIENT_SECRET;
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.isConfigured()) return null;
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) return this.cachedToken.value;

    try {
      const res = await fetch("https://outpost.mappls.com/api/security/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
        }),
      });
      if (!res.ok) return null;

      const json = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!json.access_token) return null;

      this.cachedToken = {
        value: json.access_token,
        expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000,
      };
      return this.cachedToken.value;
    } catch {
      return null;
    }
  }

  async search(query: string): Promise<AddressSuggestion[]> {
    if (query.trim().length < 3) return [];
    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const url = new URL("https://atlas.mappls.com/api/places/search/json");
      url.searchParams.set("query", query.trim());

      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];

      const json = (await res.json()) as { suggestedLocations?: MapplsSuggestion[] };
      return (json.suggestedLocations ?? [])
        .map((s): AddressSuggestion | null => {
          if (!s.city || !s.state) return null;
          return {
            label: s.placeAddress || s.placeName || s.city,
            line1: s.placeName || s.placeAddress || s.city,
            city: s.city,
            state: s.state,
            pincode: s.pincode,
            country: "India",
            countryCode: "IN",
            lat: s.latitude,
            lng: s.longitude,
          };
        })
        .filter((s): s is AddressSuggestion => s !== null);
    } catch {
      return [];
    }
  }

  async lookupPincode(pincode: string): Promise<PincodeLookupResult | null> {
    const results = await this.search(pincode);
    const first = results[0];
    if (!first) return null;
    return { city: first.city, state: first.state, country: first.country, countryCode: first.countryCode };
  }
}

let provider: MapMyIndiaProvider | null = null;

export function getMapMyIndiaProvider(): AddressProvider {
  if (!provider) provider = new MapMyIndiaProvider();
  return provider;
}
