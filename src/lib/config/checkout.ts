/**
 * Checkout behavior configuration. No customer-facing text here — see
 * src/lib/content/checkout.ts. Module 13+'s dashboard eventually becomes
 * the data source for this file; business logic that reads these values
 * doesn't change either way.
 */

export const COD_CHARGE = 40;
export const PACKING_CHARGE = 0;

export type CheckoutStepKey = "cart" | "address" | "shipping" | "payment" | "review";

/** Order these render in. Disabling a step = removing it from this array, not editing a component. */
export const CHECKOUT_STEPS: CheckoutStepKey[] = ["cart", "address", "shipping", "payment", "review"];

export const checkoutFeatureFlags = {
  enableCOD: true,
  enableOnlinePayment: true, // Razorpay — Module 11
  enableGuestCheckout: true,
  requirePhone: true,
  requireCompanyName: false,
  requireGST: false,
  enableGiftMessage: true,
  enableOrderNotes: true,
  allowAddressBook: true, // show saved addresses for logged-in customers
  enableCoupons: true,
  enableWishlistTransfer: false, // Module 12 territory
  enableExpressCheckout: false, // future
};

export type PaymentMethodKey = "COD" | "RAZORPAY" | "STRIPE" | "PAYPAL";

export interface PaymentMethodOption {
  key: PaymentMethodKey;
  label: string;
  enabled: boolean;
  /** True if this method can complete an order today; false = "Coming soon" in the UI. */
  implemented: boolean;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { key: "COD", label: "Cash on Delivery", enabled: checkoutFeatureFlags.enableCOD, implemented: true },
  { key: "RAZORPAY", label: "Card / UPI / Netbanking", enabled: true, implemented: true },
  { key: "STRIPE", label: "International Card", enabled: false, implemented: false },
  { key: "PAYPAL", label: "PayPal", enabled: false, implemented: false },
];

export type ShippingMethodKey = "flat_rate" | "free_shipping";

export interface ShippingMethodOption {
  key: ShippingMethodKey;
  label: string;
  enabled: boolean;
}

export const SHIPPING_METHODS: ShippingMethodOption[] = [
  { key: "flat_rate", label: "Standard Delivery", enabled: true },
  { key: "free_shipping", label: "Free Shipping", enabled: true },
];
