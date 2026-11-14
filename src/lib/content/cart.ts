/**
 * Customer-facing cart copy. Kept separate from src/lib/config/cart.ts
 * (which holds behavior/rules) so future localization or CMS-driven copy
 * changes only ever touch content files, never components.
 */
export const cartContent = {
  pageTitle: "Your Cart",
  emptyTitle: "Your cart is empty",
  emptyDescription: "Looks like you haven't added anything yet. Explore the collection and find something you'll love.",
  emptyCta: "Continue Shopping",
  couponPlaceholder: "Enter coupon code",
  couponApplyButton: "Apply",
  couponRemoveLabel: "Remove coupon",
  couponAppliedMessage: (code: string) => `Coupon "${code}" applied.`,
  freeShippingProgress: (amount: string) => `Add ${amount} more for free shipping.`,
  freeShippingUnlocked: "You've unlocked free shipping!",
  checkoutButton: "Proceed to Checkout",
  summaryTitle: "Order Summary",
  subtotalLabel: "Subtotal",
  shippingLabel: "Shipping",
  freeLabel: "Free",
  discountLabel: "Discount",
  totalLabel: "Total",
};

export const checkoutContent = {
  pageTitle: "Checkout",
  comingSoonTitle: "Checkout is on its way",
  comingSoonDescription:
    "We're putting the finishing touches on a smooth, secure checkout experience. Your cart is saved exactly as you left it — come back shortly to complete your order.",
  backToCartCta: "Back to Cart",
  continueShoppingCta: "Continue Shopping",
};
