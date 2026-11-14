/**
 * Shipping provider interface. Real courier integrations (Shiprocket,
 * Delhivery, Blue Dart, India Post) implement this later without checkout
 * needing to change — they'd return a real calculated charge/ETA instead
 * of a flat-rate config lookup.
 */
export interface ShippingQuote {
  charge: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

export interface ShippingAddressInput {
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface ShippingProvider {
  key: string;
  quote(params: { subtotal: number; address: ShippingAddressInput }): Promise<ShippingQuote>;
}
