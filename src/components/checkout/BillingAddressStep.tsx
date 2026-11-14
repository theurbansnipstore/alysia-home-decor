"use client";

import { getDefaultCountry } from "@/lib/config/countries";
import { Field } from "@/components/checkout/AddressStep";
import type { NewAddressValue } from "@/components/checkout/AddressStep";

interface BillingAddressStepProps {
  value: NewAddressValue;
  onChange: (value: NewAddressValue) => void;
  errors?: Record<string, string[] | undefined>;
}

/**
 * Module 38 Part 5 — the address fields only; CheckoutForm.tsx renders the
 * "Same as shipping" / "Use a different billing address" choice and the
 * surrounding section/heading, mounting this only when the customer opts
 * into a different billing address (never compulsory, never store-wide).
 * Billing addresses aren't saved to the address book (Order.billingAddress
 * is a plain snapshot, same as shipping), so unlike AddressStep this is
 * always a plain "new address" entry — no saved-address radio list to
 * reuse, hence its own small component rather than a mode flag bolted onto
 * AddressStep.
 */
export default function BillingAddressStep({ value, onChange, errors }: BillingAddressStepProps) {
  const country = getDefaultCountry();

  function updateField<K extends keyof NewAddressValue>(key: K, fieldValue: NewAddressValue[K]) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name" error={errors?.fullName}>
          <input
            value={value.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label="Mobile Number" error={errors?.phone}>
          <div className="flex">
            <span className="flex items-center border border-r-0 border-ink-100 bg-bone-200 px-3 text-sm text-ink-700">
              {country.dialCode}
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={country.phoneDigits}
              value={value.phone}
              onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, country.phoneDigits))}
              className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
            />
          </div>
        </Field>

        <div className="sm:col-span-2">
          <Field label="House No / Building" error={errors?.houseNo}>
            <input
              value={value.houseNo}
              onChange={(e) => updateField("houseNo", e.target.value)}
              placeholder="e.g. Flat 402, Sunrise Apartments"
              className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
            />
          </Field>
        </div>

        <Field label="Floor / Landmark" error={errors?.floorLandmark}>
          <input
            value={value.floorLandmark}
            onChange={(e) => updateField("floorLandmark", e.target.value)}
            placeholder="e.g. Near City Mall"
            className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label="Area / Locality" error={errors?.areaLocality}>
          <input
            value={value.areaLocality}
            onChange={(e) => updateField("areaLocality", e.target.value)}
            placeholder="Enter area / locality"
            className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label="City" error={errors?.city}>
          <input
            value={value.city}
            onChange={(e) => updateField("city", e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label="State" error={errors?.state}>
          <input
            value={value.state}
            onChange={(e) => updateField("state", e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label="Pincode" error={errors?.pincode}>
          <input
            value={value.pincode}
            onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            className="w-full border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
          />
        </Field>
      </div>
    </div>
  );
}
