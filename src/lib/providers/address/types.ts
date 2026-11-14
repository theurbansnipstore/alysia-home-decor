/**
 * The single interface checkout code calls — never a specific provider
 * directly. getAddressProvider() (in registry.ts) decides which concrete
 * implementation is active based on environment configuration; nothing
 * that calls search()/lookupPincode() needs to know or care which one.
 */
export interface AddressSuggestion {
  label: string;
  line1: string;
  /** Floor/unit/building detail, only when the provider's data includes it — otherwise left for manual entry. */
  line2?: string;
  city: string;
  state: string;
  pincode?: string;
  country: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
}

export interface PincodeLookupResult {
  city: string;
  state: string;
  country: string;
  countryCode?: string;
}

export interface AddressProvider {
  key: string;
  /** Whether this provider can actually be used right now (e.g. has a configured API key). Providers without one are skipped by the registry, never silently called. */
  isConfigured(): boolean;
  search(query: string, countryCode?: string): Promise<AddressSuggestion[]>;
  lookupPincode(pincode: string, countryCode?: string): Promise<PincodeLookupResult | null>;
}
