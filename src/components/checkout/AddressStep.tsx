"use client";

import type { ReactNode } from "react";
import { getDefaultCountry } from "@/lib/config/countries";
import { checkoutContent } from "@/lib/content/checkout";
import type { AddressDTO } from "@/lib/data/addresses";

export interface NewAddressValue {
  fullName: string;
  countryCode: string;
  /** Raw 10-digit number only — "+91" is shown as a fixed, non-editable prefix. */
  phone: string;
  houseNo: string;
  floorLandmark: string;
  areaLocality: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface AddressStepProps {
  savedAddresses: AddressDTO[];
  selectedAddressId: string | null;
  onSelectSaved: (id: string) => void;
  useNewAddress: boolean;
  onUseNewAddress: () => void;
  newAddress: NewAddressValue;
  onChangeNewAddress: (value: NewAddressValue) => void;
  errors?: Record<string, string[] | undefined>;
}

export function emptyNewAddress(): NewAddressValue {
  const defaultCountry = getDefaultCountry();
  return {
    fullName: "",
    countryCode: defaultCountry.code,
    phone: "",
    houseNo: "",
    floorLandmark: "",
    areaLocality: "",
    city: "",
    state: "",
    pincode: "",
    country: defaultCountry.name,
  };
}

export default function AddressStep({
  savedAddresses,
  selectedAddressId,
  onSelectSaved,
  useNewAddress,
  onUseNewAddress,
  newAddress,
  onChangeNewAddress,
  errors,
}: AddressStepProps) {
  // Only India is offered today — this reads the same countries.ts config
  // that will later drive a real selector, so enabling more countries is
  // a UI change here, not an architecture change.
  const country = getDefaultCountry();

  function updateField<K extends keyof NewAddressValue>(key: K, value: NewAddressValue[K]) {
    onChangeNewAddress({ ...newAddress, [key]: value });
  }

  return (
    <section className="border border-ink-100 bg-bone p-5 sm:p-6">
      <h2 className="mb-5 font-display text-lg text-ink">{checkoutContent.addressTitle}</h2>

      {savedAddresses.length > 0 && (
        <div className="mb-6 space-y-2">
          {savedAddresses.map((addr) => (
            <label
              key={addr.id}
              className={`flex cursor-pointer items-start gap-3 border p-3 text-sm transition-colors ${
                !useNewAddress && selectedAddressId === addr.id ? "border-ink bg-bone-200" : "border-ink-100"
              }`}
            >
              <input
                type="radio"
                name="saved-address"
                checked={!useNewAddress && selectedAddressId === addr.id}
                onChange={() => onSelectSaved(addr.id)}
                className="mt-1 shrink-0"
              />
              <span>
                <span className="block font-body text-charcoal">
                  {addr.fullName} {addr.label && <span className="text-ink-500">({addr.label})</span>}
                </span>
                <span className="block text-ink-500">
                  {addr.line1}, {addr.line2 ? `${addr.line2}, ` : ""}
                  {addr.city}, {addr.state} {addr.pincode} · {addr.phone}
                </span>
              </span>
            </label>
          ))}
          <button
            type="button"
            onClick={onUseNewAddress}
            className={`text-xs uppercase tracking-widest ${useNewAddress ? "text-ink" : "text-brass-600"}`}
          >
            {checkoutContent.newAddressCta}
          </button>
        </div>
      )}

      {(useNewAddress || savedAddresses.length === 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={checkoutContent.addressFullNameLabel} error={errors?.fullName}>
            <input
              value={newAddress.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
            />
          </Field>

          <Field label={checkoutContent.addressPhoneLabel} error={errors?.phone}>
            <div className="flex">
              <span className="flex items-center border border-r-0 border-ink-100 bg-bone-200 px-3 text-sm text-ink-700">
                {country.dialCode}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={country.phoneDigits}
                value={newAddress.phone}
                onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, country.phoneDigits))}
                className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
              />
            </div>
          </Field>

          <div className="sm:col-span-2">
            <Field label={checkoutContent.addressHouseNoLabel} error={errors?.houseNo}>
              <input
                value={newAddress.houseNo}
                onChange={(e) => updateField("houseNo", e.target.value)}
                placeholder="e.g. Flat 402, Sunrise Apartments"
                className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
              />
            </Field>
          </div>

          <Field label={checkoutContent.addressFloorLandmarkLabel} error={errors?.floorLandmark}>
            <input
              value={newAddress.floorLandmark}
              onChange={(e) => updateField("floorLandmark", e.target.value)}
              placeholder="e.g. Near City Mall"
              className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
            />
          </Field>

          <Field label={checkoutContent.addressAreaLocalityLabel} error={errors?.areaLocality}>
            <input
              value={newAddress.areaLocality}
              onChange={(e) => updateField("areaLocality", e.target.value)}
              placeholder="Enter area / locality"
              className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
            />
          </Field>

          <Field label={checkoutContent.addressCityLabel} error={errors?.city}>
            <input
              value={newAddress.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
            />
          </Field>

          <Field label={checkoutContent.addressStateLabel} error={errors?.state}>
            <input
              value={newAddress.state}
              onChange={(e) => updateField("state", e.target.value)}
              className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
            />
          </Field>

          <Field label={checkoutContent.addressPincodeLabel} error={errors?.pincode}>
            <input
              value={newAddress.pincode}
              onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
            />
          </Field>
        </div>
      )}
    </section>
  );
}

/** Exported for reuse by BillingAddressStep.tsx (Module 37) — identical field/error layout, no need for a second copy. */
export function Field({ label, error, children }: { label: string; error?: string[]; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-ink-700">{label}</label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-clay">
          {error[0]}
        </p>
      )}
    </div>
  );
}
