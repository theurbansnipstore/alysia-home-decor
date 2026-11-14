"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import AddressStep, { emptyNewAddress, type NewAddressValue } from "@/components/checkout/AddressStep";
import BillingAddressStep from "@/components/checkout/BillingAddressStep";
import PaymentStep from "@/components/checkout/PaymentStep";
import CustomerNotes from "@/components/checkout/CustomerNotes";
import { checkoutContent } from "@/lib/content/checkout";
import { addressFormSchema } from "@/lib/validations/checkout";
import { openRazorpayCheckout } from "@/lib/payment/razorpay-client";
import { getBrandSettings } from "@/lib/config/brand";
import type { AddressDTO } from "@/lib/data/addresses";
import type { CheckoutSettings } from "@/lib/settings/checkout";

interface CheckoutFormProps {
  savedAddresses: AddressDTO[];
  defaultEmail?: string;
  checkoutSettings: CheckoutSettings;
  /** Per-account COD restriction (Module 21) — distinct from checkoutSettings.enableCOD, which is a store-wide toggle. Server-side enforcement lives in order-service.ts; this only drives the UI. */
  codBlockedForCustomer?: boolean;
}

/**
 * Combines the three UI-facing address fields into the two-field
 * line1/line2 shape the Address/Order schema actually stores — per the
 * exact mapping specified:
 *   line1 = House No / Flat / Building
 *   line2 = "{Floor / Landmark}, {Area / Locality}"
 */
function toShippingAddressPayload(newAddress: NewAddressValue) {
  return {
    fullName: newAddress.fullName,
    countryCode: newAddress.countryCode,
    phone: newAddress.phone,
    line1: newAddress.houseNo,
    line2: `${newAddress.floorLandmark}, ${newAddress.areaLocality}`,
    city: newAddress.city,
    state: newAddress.state,
    pincode: newAddress.pincode,
    country: newAddress.country,
  };
}

export default function CheckoutForm({ savedAddresses, defaultEmail, checkoutSettings, codBlockedForCustomer }: CheckoutFormProps) {
  const router = useRouter();

  const codAvailable = checkoutSettings.enableCOD && !codBlockedForCustomer;

  const defaultAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [useNewAddress, setUseNewAddress] = useState(savedAddresses.length === 0);
  const [newAddress, setNewAddress] = useState<NewAddressValue>(emptyNewAddress());
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(codAvailable ? "COD" : "RAZORPAY");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  const [addressErrors, setAddressErrors] = useState<Record<string, string[] | undefined>>({});
  // Module 43: the choice is only offered at all when
  // checkoutSettings.allowDifferentBillingAddress is ON — when OFF, billing
  // always equals shipping and billingSameAsShipping simply never becomes
  // false (no UI ever sets it). "Same as shipping" stays the default either
  // way. Server-side enforcement (order-service.ts / create-order route)
  // never trusts this flag alone regardless of which state the setting is in.
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<NewAddressValue>(emptyNewAddress());
  const [billingErrors, setBillingErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateBeforeSubmit(): boolean {
    let ok = true;
    setEmailError(null);
    setAddressErrors({});
    setBillingErrors({});

    if (!email.trim()) {
      setEmailError("Email is required.");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      ok = false;
    }

    if (useNewAddress || !selectedAddressId) {
      const parsed = addressFormSchema.safeParse(newAddress);
      if (!parsed.success) {
        setAddressErrors(parsed.error.flatten().fieldErrors);
        ok = false;
      }
    }

    if (!billingSameAsShipping) {
      const parsed = addressFormSchema.safeParse(billingAddress);
      if (!parsed.success) {
        setBillingErrors(parsed.error.flatten().fieldErrors);
        ok = false;
      }
    }

    return ok;
  }

  function buildBasePayload() {
    return {
      email,
      deliveryInstructions: deliveryInstructions || undefined,
      giftMessage: giftMessage || undefined,
      ...(useNewAddress || !selectedAddressId
        ? { shippingAddress: toShippingAddressPayload(newAddress) }
        : { savedAddressId: selectedAddressId }),
      ...(billingSameAsShipping
        ? { billingSameAsShipping: true }
        : { billingSameAsShipping: false, billingAddress: toShippingAddressPayload(billingAddress) }),
    };
  }

  async function submitCod() {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...buildBasePayload(), paymentMethod: "COD" }),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      setFormError(json.error || "Something went wrong. Please try again.");
      if (json.details) setAddressErrors(json.details);
      setIsSubmitting(false);
      return;
    }

    router.push(`/checkout/confirmation/${json.data.orderId}`);
  }

  /**
   * Attempt-first Razorpay flow (Module 11): create-order does not create a
   * real Order yet. The redirect to confirmation only happens after /verify
   * succeeds — same finalize logic the webhook uses, so this UI path and a
   * closed-browser/webhook-only path always converge on the same result.
   */
  async function submitRazorpay() {
    const res = await fetch("/api/payment/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBasePayload()),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      setFormError(json.error || "Could not start payment. Please try again.");
      if (json.details) setAddressErrors(json.details);
      setIsSubmitting(false);
      return;
    }

    const brand = getBrandSettings();
    const contact =
      useNewAddress || !selectedAddressId ? newAddress.phone : savedAddresses.find((a) => a.id === selectedAddressId)?.phone;

    try {
      await openRazorpayCheckout({
        keyId: json.data.keyId,
        amount: json.data.amount,
        currency: json.data.currency,
        razorpayOrderId: json.data.razorpayOrderId,
        name: brand.name,
        description: "Order payment",
        prefill: { email, contact },
        onSuccess: async (response) => {
          try {
            const verifyRes = await fetch("/api/payment/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok || !verifyJson.success) {
              setFormError(
                verifyJson.error ||
                  "Payment succeeded but could not be confirmed automatically. Please contact support with your payment reference before retrying."
              );
              setIsSubmitting(false);
              return;
            }
            router.push(`/checkout/confirmation/${verifyJson.data.orderId}`);
          } catch {
            setFormError(
              "Payment succeeded but confirmation failed to reach our server. Please contact support before retrying — you may have already been charged."
            );
            setIsSubmitting(false);
          }
        },
        onDismiss: () => {
          // Cancelled — cart and form state are untouched, safe to retry immediately.
          setIsSubmitting(false);
        },
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not open the payment window.");
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validateBeforeSubmit()) {
      setFormError("Please fix the highlighted fields below.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (paymentMethod === "RAZORPAY") {
        await submitRazorpay();
      } else {
        await submitCod();
      }
    } catch {
      setFormError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError && (
        <p role="alert" className="border border-clay/40 bg-clay/5 px-4 py-3 text-sm text-clay">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="checkout-email" className="mb-1.5 block text-sm text-ink-700">
          {checkoutContent.addressEmailLabel}
        </label>
        <input
          id="checkout-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full max-w-sm border border-ink-100 bg-bone px-3 py-2.5 text-sm focus:border-brass focus:outline-none"
        />
        {emailError && (
          <p role="alert" className="mt-1 text-xs text-clay">
            {emailError}
          </p>
        )}
      </div>

      <AddressStep
        savedAddresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        onSelectSaved={(id) => {
          setSelectedAddressId(id);
          setUseNewAddress(false);
        }}
        useNewAddress={useNewAddress}
        onUseNewAddress={() => setUseNewAddress(true)}
        newAddress={newAddress}
        onChangeNewAddress={setNewAddress}
        errors={addressErrors}
      />

      {checkoutSettings.allowDifferentBillingAddress && (
        <section className="border border-ink-100 bg-bone p-5 sm:p-6">
          <h2 className="mb-3 font-display text-lg text-ink">Billing Address</h2>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="radio"
                name="billing-choice"
                checked={billingSameAsShipping}
                onChange={() => setBillingSameAsShipping(true)}
                className="h-4 w-4"
              />
              Same as shipping address
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="radio"
                name="billing-choice"
                checked={!billingSameAsShipping}
                onChange={() => setBillingSameAsShipping(false)}
                className="h-4 w-4"
              />
              Use a different billing address
            </label>
          </div>

          {!billingSameAsShipping && (
            <div className="mt-5">
              <BillingAddressStep value={billingAddress} onChange={setBillingAddress} errors={billingErrors} />
            </div>
          )}
        </section>
      )}

      <PaymentStep
        value={paymentMethod}
        onChange={setPaymentMethod}
        enableCOD={codAvailable}
        enableOnlinePayment={checkoutSettings.enableOnlinePayment}
        codRestrictedForAccount={!!codBlockedForCustomer && checkoutSettings.enableCOD}
      />

      <CustomerNotes
        deliveryInstructions={deliveryInstructions}
        onChangeDeliveryInstructions={setDeliveryInstructions}
        giftMessage={giftMessage}
        onChangeGiftMessage={setGiftMessage}
        enableOrderNotes={checkoutSettings.enableOrderNotes}
        enableGiftMessage={checkoutSettings.enableGiftMessage}
      />

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? checkoutContent.placingOrder : checkoutSettings.placeOrderButtonText || checkoutContent.placeOrderButton}
      </Button>
    </form>
  );
}
