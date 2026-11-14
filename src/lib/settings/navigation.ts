import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_navigation";

export interface NavItemSetting {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
  children?: { id: string; label: string; href: string; enabled: boolean; sortOrder: number }[];
}

/** Module 37 Part 11 — the Shop mega-menu's "Shop by Room" column. Unlike the mega-menu's Categories/Themes columns (always live-rebuilt from real data, still true), these are curated shortcut links an admin picks by hand, so they're genuinely editorial content, not a duplicate of commerce data. */
export interface ShopByRoomLinkSetting {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
}

export interface ShopByRoomSetting {
  heading: string;
  enabled: boolean;
  links: ShopByRoomLinkSetting[];
}

/**
 * Module 38 Part 6 — the Shop mega-menu's Categories/Themes columns.
 * "auto" (the default) reproduces today's exact behavior: the first `limit`
 * live, visible categories/themes in their real catalog sortOrder, always
 * live-rebuilt (renaming/reordering/hiding a category is reflected with no
 * admin action here). "custom" lets an admin hand-pick which categories/
 * themes appear and in what order — storing only real Category/Theme ids
 * (`refs`), never a duplicated name or slug, so a renamed entity still
 * resolves correctly and a later-deleted or hidden one is silently dropped
 * at render time (getMainNav filters refs against the live, visible-only
 * catalog list) rather than producing a broken link.
 */
export interface MegaMenuLinkRef {
  id: string;
  sortOrder: number;
}

export interface MegaMenuColumnSetting {
  heading: string;
  mode: "auto" | "custom";
  /** "auto" mode only — how many of the live catalog's items to show. */
  limit: number;
  /** "custom" mode only — hand-picked, ordered references to real Category/Theme ids. */
  refs: MegaMenuLinkRef[];
}

export interface NavigationSettings {
  items: NavItemSetting[];
  shopByRoom: ShopByRoomSetting;
  megaMenuCategories: MegaMenuColumnSetting;
  megaMenuThemes: MegaMenuColumnSetting;
}

/**
 * Matches today's hardcoded STATIC_NAV exactly (src/lib/config/navigation.ts)
 * — an unconfigured store renders the identical menu it does today. The
 * Shop item's live category/theme mega-menu columns are NOT represented
 * here; they stay code-driven (getMainNav() rebuilds them from real
 * Category/Theme data regardless of this setting) since hand-authored JSON
 * could drift out of sync with real, renamed, or hidden categories.
 * shopByRoom.links match the mega-menu's previously-hardcoded SHOP_BY_ROOM
 * array exactly, so an unconfigured store's mega-menu is unchanged.
 */
export const DEFAULT_NAVIGATION: NavigationSettings = {
  items: [
    { id: "shop", label: "Shop", href: "/categories", enabled: true, sortOrder: 0 },
    { id: "themes", label: "Themes", href: "/themes", enabled: true, sortOrder: 1 },
    { id: "collections", label: "Collections", href: "/collections", enabled: true, sortOrder: 2 },
    { id: "about", label: "About", href: "/about", enabled: true, sortOrder: 3 },
    { id: "contact", label: "Contact", href: "/contact", enabled: true, sortOrder: 4 },
  ],
  shopByRoom: {
    heading: "Shop by Room",
    enabled: true,
    links: [
      { id: "room-living", label: "Living Room", href: "/categories/living-room-decor", enabled: true, sortOrder: 0 },
      { id: "room-bedroom", label: "Bedroom", href: "/categories/bedroom-decor", enabled: true, sortOrder: 1 },
      { id: "room-dining", label: "Dining", href: "/categories/dining-decor", enabled: true, sortOrder: 2 },
      { id: "room-kitchen", label: "Kitchen", href: "/categories/kitchen-accessories", enabled: true, sortOrder: 3 },
    ],
  },
  megaMenuCategories: { heading: "Categories", mode: "auto", limit: 5, refs: [] },
  megaMenuThemes: { heading: "Themes", mode: "auto", limit: 5, refs: [] },
};

export async function getNavigationSettings(): Promise<NavigationSettings> {
  return getStoreSetting(KEY, DEFAULT_NAVIGATION);
}

export async function setNavigationSettings(value: NavigationSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
