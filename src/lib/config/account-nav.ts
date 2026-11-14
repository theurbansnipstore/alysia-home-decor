export interface AccountNavItem {
  label: string;
  href: string;
  status: "active" | "comingSoon";
}

export const accountNavItems: AccountNavItem[] = [
  { label: "Profile & Security", href: "/account", status: "active" },
  { label: "Addresses", href: "/account/addresses", status: "active" },
  { label: "Orders", href: "/account/orders", status: "active" },
  { label: "Wishlist", href: "/account?tab=wishlist", status: "active" },
  { label: "Reviews", href: "/account/reviews", status: "active" },
];

/**
 * Orders/Addresses/Profile are never filtered — only Wishlist/Reviews can
 * be hidden from the nav (store_account setting). The underlying pages
 * (/account?tab=wishlist, /account/reviews) stay fully reachable either
 * way, same as Careers staying reachable when hidden from site nav —
 * this only controls whether the tab is listed, not whether it works.
 */
export function getVisibleAccountNavItems(settings: { showWishlistTab: boolean; showReviewsTab: boolean }): AccountNavItem[] {
  return accountNavItems.filter((item) => {
    if (item.label === "Wishlist") return settings.showWishlistTab;
    if (item.label === "Reviews") return settings.showReviewsTab;
    return true;
  });
}
