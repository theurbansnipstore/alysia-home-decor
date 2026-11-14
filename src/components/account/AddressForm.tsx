"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { checkoutContent } from "@/lib/content/checkout";
import { getDefaultCountry } from "@/lib/config/countries";
import type { AddressDTO } from "@/lib/data/addresses";

interface AddressFormProps {
  initial?: AddressDTO;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Saved addresses are stored the same way checkout snapshots them
 * (line1/line2 — see Module 9.6.1's mapping decision): line1 = House
 * No/Flat/Building, line2 = "Floor/Landmark, Area/Locality". When editing
 * an existing address, its stored line2 is split back into two display
 * fields on a best-effort basis (split on the first comma) — saved
 * addresses created before this restructuring may not split perfectly
 * cleanly, which is a reasonable, disclosed tradeoff rather than a
 * reason to add new storage fields.
 */
function splitLine2(line2: string | null | undefined): { floorLandmark: string; areaLocality: string } {
  if (!line2) return { floorLandmark: "", areaLocality: "" };
  const [first, ...rest] = line2.split(",").map((s) => s.trim());
  return { floorLandmark: first ?? "", areaLocality: rest.join(", ") };
}

export default function AddressForm({ initial, onSaved, onCancel }: AddressFormProps) {
  const country = getDefaultCountry();
  const initialSplit = splitLine2(initial?.line2);

  const [label, setLabel] = useState(initial?.label ?? "");
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [houseNo, setHouseNo] = useState(initial?.line1 ?? "");
  const [floorLandmark, setFloorLandmark] = useState(initialSplit.floorLandmark);
  const [areaLocality, setAreaLocality] = useState(initialSplit.areaLocality);
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [pincode, setPincode] = useState(initial?.pincode ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const url = initial ? `/api/account/addresses/${initial.id}` : "/api/account/addresses";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label || undefined,
          fullName,
          phone,
          line1: houseNo,
          line2: `${floorLandmark}, ${areaLocality}`,
          city,
          state,
          pincode,
          country: country.name,
          isDefault,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save this address.");
        if (json.details) setFieldErrors(json.details);
        return;
      }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-ink-100 bg-bone p-5">
      {error && (
        <p role="alert" className="border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm text-ink-700">{checkoutContent.addressNicknameLabel}</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={checkoutContent.addressNicknamePlaceholder}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={checkoutContent.addressFullNameLabel} error={fieldErrors.fullName}>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label={checkoutContent.addressPhoneLabel} error={fieldErrors.phone}>
          <div className="flex">
            <span className="flex items-center border border-r-0 border-ink-100 bg-bone-200 px-3 text-sm text-ink-700">
              {country.dialCode}
            </span>
            <input
              required
              type="tel"
              inputMode="numeric"
              maxLength={country.phoneDigits}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, country.phoneDigits))}
              className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
        </Field>

        <div className="sm:col-span-2">
          <Field label={checkoutContent.addressHouseNoLabel} error={fieldErrors.line1}>
            <input
              required
              value={houseNo}
              onChange={(e) => setHouseNo(e.target.value)}
              className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </Field>
        </div>

        <Field label={checkoutContent.addressFloorLandmarkLabel} error={fieldErrors.line2}>
          <input
            required
            value={floorLandmark}
            onChange={(e) => setFloorLandmark(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label={checkoutContent.addressAreaLocalityLabel}>
          <input
            required
            value={areaLocality}
            onChange={(e) => setAreaLocality(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label={checkoutContent.addressCityLabel} error={fieldErrors.city}>
          <input
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label={checkoutContent.addressStateLabel} error={fieldErrors.state}>
          <input
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label={checkoutContent.addressPincodeLabel} error={fieldErrors.pincode}>
          <input
            required
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </Field>

        <Field label={checkoutContent.addressCountryLabel}>
          <div className="flex h-[38px] items-center border border-ink-100 bg-bone-200 px-3 text-sm text-ink-700">
            {country.name} ({country.dialCode})
          </div>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Set as default address
      </label>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Address"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-ink-700">{label}</label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-clay">
          {error[0]}
        </p>
      )}
    </div>
  );
}
