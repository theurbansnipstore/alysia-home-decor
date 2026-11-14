export interface CountryOption {
  /** ISO 3166-1 alpha-2 */
  code: string;
  name: string;
  dialCode: string;
  phonePattern: RegExp;
  phoneDigits: number;
  isDefault?: boolean;
}

/**
 * Supported countries for checkout — controls phone dial code, phone
 * validation, and the default pre-selected country. Today a static list;
 * Module 13+'s Admin Dashboard becomes the data source for this function
 * without any consuming component changing — same shape, different
 * source. India is marked `isDefault` here; nothing else in the codebase
 * should hardcode India as an assumption (see AddressStep/CheckoutForm,
 * which are fully country-driven from this list).
 */
export function getSupportedCountries(): CountryOption[] {
  return [
    { code: "IN", name: "India", dialCode: "+91", phonePattern: /^[6-9]\d{9}$/, phoneDigits: 10, isDefault: true },
    { code: "US", name: "United States", dialCode: "+1", phonePattern: /^\d{10}$/, phoneDigits: 10 },
    { code: "GB", name: "United Kingdom", dialCode: "+44", phonePattern: /^\d{10}$/, phoneDigits: 10 },
    { code: "AE", name: "United Arab Emirates", dialCode: "+971", phonePattern: /^\d{9}$/, phoneDigits: 9 },
    { code: "AU", name: "Australia", dialCode: "+61", phonePattern: /^\d{9}$/, phoneDigits: 9 },
    { code: "CA", name: "Canada", dialCode: "+1", phonePattern: /^\d{10}$/, phoneDigits: 10 },
    { code: "SG", name: "Singapore", dialCode: "+65", phonePattern: /^\d{8}$/, phoneDigits: 8 },
  ];
}

export function getDefaultCountry(): CountryOption {
  const countries = getSupportedCountries();
  return countries.find((c) => c.isDefault) ?? countries[0];
}

export function getCountryByCode(code: string): CountryOption | undefined {
  return getSupportedCountries().find((c) => c.code === code);
}
