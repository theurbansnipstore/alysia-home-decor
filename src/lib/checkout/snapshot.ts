import "server-only";
import type { AddressDTO } from "@/lib/data/addresses";

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
}

/** Converts a saved Address row into the same shape used for guest form input. Saved addresses predate the international rework and have no countryCode/lat/lng columns — country defaults to "India" for backward compatibility with existing rows. */
export function addressToSnapshot(address: AddressDTO): AddressSnapshot {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? undefined,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country || "India",
    countryCode: address.country === "India" || !address.country ? "IN" : undefined,
  };
}
