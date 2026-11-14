"use client";

import { PAYMENT_METHODS } from "@/lib/config/checkout";
import { checkoutContent } from "@/lib/content/checkout";

interface PaymentStepProps {
  value: string;
  onChange: (key: string) => void;
  enableCOD: boolean;
  enableOnlinePayment: boolean;
  /** True only when the store allows COD generally but this specific account is restricted — shows a distinct, non-alarming message rather than just silently omitting the option. Never reveals the underlying risk logic. */
  codRestrictedForAccount?: boolean;
}

/** Admin-managed enableCOD/enableOnlinePayment gate PAYMENT_METHODS' existing .enabled list on top of it — never bypassing .implemented, which stays code-controlled (Stripe/PayPal stay "Coming soon" regardless of settings). */
export default function PaymentStep({ value, onChange, enableCOD, enableOnlinePayment, codRestrictedForAccount }: PaymentStepProps) {
  const methods = PAYMENT_METHODS.filter((m) => {
    if (!m.enabled) return false;
    if (m.key === "COD") return enableCOD;
    if (m.key === "RAZORPAY") return enableOnlinePayment;
    return true;
  });

  return (
    <section className="border border-ink-100 bg-bone-100 p-5 sm:p-6">
      <h2 className="mb-4 font-display text-lg text-ink">{checkoutContent.paymentTitle}</h2>
      <div className="space-y-2">
        {methods.map((method) => (
          <label
            key={method.key}
            className={`flex items-center justify-between gap-3 border p-3 text-sm transition-colors ${
              method.implemented ? "cursor-pointer" : "cursor-not-allowed opacity-60"
            } ${value === method.key ? "border-ink bg-bone-200" : "border-ink-100"}`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="payment-method"
                checked={value === method.key}
                disabled={!method.implemented}
                onChange={() => onChange(method.key)}
              />
              <span className="text-charcoal">{method.label}</span>
            </span>
            {!method.implemented && (
              <span className="text-xs uppercase tracking-widest text-ink-300">{checkoutContent.paymentComingSoon}</span>
            )}
          </label>
        ))}
      </div>
      {codRestrictedForAccount && (
        <p className="mt-3 text-xs text-ink-500">
          Cash on Delivery isn&apos;t currently available for this account. Please use online payment.
        </p>
      )}
    </section>
  );
}
