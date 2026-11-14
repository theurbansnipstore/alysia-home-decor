import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_account";

/**
 * Orders/Addresses are deliberately NOT toggleable here — they're
 * transactional account functions, not marketing content; hiding them
 * would look broken, not like a legitimate business decision. Wishlist/
 * Reviews tabs mirror the same global feature flags that already control
 * those features storefront-wide (src/lib/settings/ — no second on/off
 * switch, just whether the account tab reflects it).
 */
export interface AccountSettings {
  heading: string;
  welcomeMessage: string;
  showWishlistTab: boolean;
  showReviewsTab: boolean;
}

export const DEFAULT_ACCOUNT: AccountSettings = {
  heading: "My Account",
  welcomeMessage: "",
  showWishlistTab: true,
  showReviewsTab: true,
};

export async function getAccountSettings(): Promise<AccountSettings> {
  return getStoreSetting(KEY, DEFAULT_ACCOUNT);
}

export async function setAccountSettings(value: AccountSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
