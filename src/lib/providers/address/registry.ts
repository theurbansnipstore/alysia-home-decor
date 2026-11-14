import "server-only";
import type { AddressProvider } from "./types";
import { getGooglePlacesProvider } from "./google-places";
import { getMapMyIndiaProvider } from "./mapmyindia";
import { getHereMapsProvider } from "./here-maps";
import { getLocationIqProvider } from "./locationiq";
import { getNominatimProvider } from "./nominatim";
import { getIndiaPostProvider } from "./india-post";

export type AddressProviderKey = "google_places" | "mapmyindia" | "here" | "locationiq" | "nominatim";

const PROVIDER_FACTORIES: Record<AddressProviderKey, () => AddressProvider> = {
  google_places: getGooglePlacesProvider,
  mapmyindia: getMapMyIndiaProvider,
  here: getHereMapsProvider,
  locationiq: getLocationIqProvider,
  nominatim: getNominatimProvider,
};

function resolvePrimaryProvider(): AddressProvider {
  const requested = (process.env.ADDRESS_PROVIDER || "").toLowerCase() as AddressProviderKey;
  const factory = PROVIDER_FACTORIES[requested];

  if (factory) {
    const instance = factory();
    if (instance.isConfigured()) return instance;
    console.warn(
      `[address-provider] ADDRESS_PROVIDER="${requested}" is set but missing its API key — falling back to Nominatim.`
    );
  }

  return getNominatimProvider();
}

/**
 * Checkout and the address API routes call ONLY this function — never a
 * specific provider class directly. Set ADDRESS_PROVIDER in the
 * environment to "google_places" | "mapmyindia" | "here" | "locationiq"
 * (plus that provider's required key env var(s)) to switch; unset or
 * missing key = automatic fallback to Nominatim, which always works.
 */
export function getAddressProvider(): AddressProvider {
  return resolvePrimaryProvider();
}

/**
 * India pincode lookups specifically prefer India Post (more accurate for
 * Indian PIN codes) unless a paid provider has been explicitly configured
 * — an explicit choice takes priority over this default preference.
 */
export function getPincodeProvider(countryCode: string): AddressProvider {
  const primary = resolvePrimaryProvider();
  if (countryCode === "IN" && primary.key === "nominatim") {
    return getIndiaPostProvider();
  }
  return primary;
}
