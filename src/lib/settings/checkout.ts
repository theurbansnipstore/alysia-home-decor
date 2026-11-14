import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_checkout";

/**
 * Presentation/offering toggles only — mirrors checkoutFeatureFlags in
 * src/lib/config/checkout.ts, which already carried a comment anticipating
 * exactly this move to a dashboard-backed source. Toggling enableCOD/
 * enableOnlinePayment here only controls which payment method the
 * storefront OFFERS; it never touches order-service.ts, razorpay-finalize.ts,
 * or placeOrderSchema's validation — those remain the sole authority over
 * whether an order can actually be placed. Turning both off would leave
 * checkout with no usable payment method — that's an admin misconfiguration
 * risk, not a code risk, and is called out in the admin UI.
 *
 * Module 38 Part 5 removed the old `requireBillingAddress` store-wide
 * toggle entirely and made the "same as shipping" / "different billing"
 * choice unconditional for every customer. Module 43 reintroduces a
 * store-wide toggle, under a new name — `allowDifferentBillingAddress` —
 * because the desired ON/OFF meaning ("customer MAY optionally choose a
 * different billing address") is the opposite of what "require" implies,
 * and the old key was already fully removed from this interface (never
 * merely unused), so there is no live Setting row to preserve
 * compatibility with. OFF (the default) means only "same as shipping" is
 * offered — the previous unconditional-choice behavior is now the ON
 * state, not the only state. Enforced server-side in
 * order-service.ts/placeOrder() and the Razorpay create-order route, not
 * just hidden in the UI.
 */
export interface CheckoutSettings {
  heading: string;
  placeOrderButtonText: string;
  enableCOD: boolean;
  enableOnlinePayment: boolean;
  enableGuestCheckout: boolean;
  enableGiftMessage: boolean;
  enableOrderNotes: boolean;
  allowDifferentBillingAddress: boolean;
}

export const DEFAULT_CHECKOUT: CheckoutSettings = {
  heading: "Checkout",
  placeOrderButtonText: "Place Order",
  enableCOD: true,
  enableOnlinePayment: true,
  enableGuestCheckout: true,
  enableGiftMessage: true,
  enableOrderNotes: true,
  allowDifferentBillingAddress: false,
};

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  return getStoreSetting(KEY, DEFAULT_CHECKOUT);
}

export async function setCheckoutSettings(value: CheckoutSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
