import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_cart";

export interface CartContentSettings {
  heading: string;
  emptyTitle: string;
  emptyDescription: string;
  continueShoppingText: string;
  showCoupon: boolean;
  showRecommendations: boolean;
}

/** Text defaults match src/lib/content/cart.ts exactly. Coupon validation and cart math are untouched — this only controls whether the coupon field/recommendation rail render. */
export const DEFAULT_CART: CartContentSettings = {
  heading: "Your Cart",
  emptyTitle: "Your cart is empty",
  emptyDescription: "Looks like you haven't added anything yet. Explore the collection and find something you'll love.",
  continueShoppingText: "Continue Shopping",
  showCoupon: true,
  showRecommendations: true,
};

export async function getCartSettings(): Promise<CartContentSettings> {
  return getStoreSetting(KEY, DEFAULT_CART);
}

export async function setCartSettings(value: CartContentSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
