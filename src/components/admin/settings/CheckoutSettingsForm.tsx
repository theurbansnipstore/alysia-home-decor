"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { CheckoutSettings } from "@/lib/settings/checkout";
import Button from "@/components/ui/Button";

export default function CheckoutSettingsForm({ initial }: { initial: CheckoutSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof CheckoutSettings>(key: K) {
    return {
      value: values[key] as string,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  function toggle(key: keyof CheckoutSettings) {
    return {
      checked: values[key] as boolean,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.checked })),
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/checkout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save checkout settings.");
        return;
      }
      setMessage("Checkout settings saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 border border-ink-100 bg-bone p-6">
      <p className="text-xs text-ink-500">
        Presentation and payment-method offering only. Order validation, stock checks, and Razorpay/COD
        internals are unaffected by these settings.
      </p>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Checkout Heading</label>
        <input type="text" required {...field("heading")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Place Order Button Text</label>
        <input type="text" required {...field("placeOrderButtonText")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" {...toggle("enableCOD")} className="h-4 w-4 border-ink-100" />
        Offer Cash on Delivery
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" {...toggle("enableOnlinePayment")} className="h-4 w-4 border-ink-100" />
        Offer Online Payment (Razorpay) — inactive until credentials are configured
      </label>
      {!values.enableCOD && !values.enableOnlinePayment && (
        <p className="text-xs text-clay">At least one payment method must stay enabled — this will be rejected on save.</p>
      )}
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" {...toggle("enableGuestCheckout")} className="h-4 w-4 border-ink-100" />
        Allow guest checkout (no account required)
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" {...toggle("enableGiftMessage")} className="h-4 w-4 border-ink-100" />
        Show gift message field
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" {...toggle("enableOrderNotes")} className="h-4 w-4 border-ink-100" />
        Show delivery instructions field
      </label>
      <div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" {...toggle("allowDifferentBillingAddress")} className="h-4 w-4 border-ink-100" />
          Allow different billing address
        </label>
        <p className="mt-1 text-xs text-ink-500">
          When enabled, customers can choose to enter a billing address different from their shipping address at
          checkout. When disabled (the default), every order simply uses the shipping address as the billing
          address — no choice is shown.
        </p>
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <Button type="submit" variant="primary" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
