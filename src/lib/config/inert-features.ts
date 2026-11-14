/**
 * Copy for features that are architecturally real (props contracts, click
 * handlers) but not yet functionally wired — cart (Module 8). Centralized
 * so the same feature is described consistently everywhere it appears, and
 * so wiring in the real feature later means updating the click handler,
 * not hunting for every place the message was typed out.
 */
export const inertFeatureMessages = {
  cart: "Cart is coming soon — this product isn't purchasable yet.",
} as const;
