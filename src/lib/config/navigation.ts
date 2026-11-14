import { getAllCategories } from "@/lib/data/categories";
import { getAllThemes } from "@/lib/data/themes";
import { getNavigationSettings, type MegaMenuColumnSetting } from "@/lib/settings/navigation";
import { getFooterSettings } from "@/lib/settings/footer";
import type { NavLink } from "@/types";

export interface MegaMenuColumn {
  heading: string;
  links: NavLink[];
}

export interface MainNavItem extends NavLink {
  megaMenu?: MegaMenuColumn[];
}

/**
 * Reads admin-managed nav items (src/lib/settings/navigation.ts — defaults
 * to today's exact static list if never configured) and layers the Shop
 * item's mega-menu on top, still always rebuilt from real Category/Theme
 * data. The mega-menu is matched onto whichever configured item points at
 * "/categories" (today's Shop item) rather than a hardcoded label, so a
 * renamed Shop item keeps its mega-menu.
 *
 * Module 37 Part 11: the "Shop by Room" column is admin-editable (heading,
 * links, add/remove/reorder/hide) via the same navigation setting —
 * previously a hardcoded SHOP_BY_ROOM array here with no admin control at
 * all.
 *
 * Module 38 Part 6: the Categories/Themes columns are now ALSO admin-
 * controllable (add/remove/reorder/hide, or leave on "auto" for the prior
 * always-live-from-catalog behavior — see MegaMenuColumnSetting's doc
 * comment in navigation.ts). Either way, a category/theme is only ever
 * looked up by id against the current, visible, real catalog list — a
 * renamed entity resolves correctly, and a since-deleted or hidden one is
 * silently dropped rather than producing a broken link.
 */
function resolveMegaMenuColumn<T extends { id: string; name: string; slug: string }>(
  section: MegaMenuColumnSetting,
  liveEntities: T[],
  hrefFor: (entity: T) => string
): MegaMenuColumn {
  if (section.mode === "custom") {
    const byId = new Map(liveEntities.map((e) => [e.id, e]));
    const links = [...section.refs]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ref) => byId.get(ref.id))
      .filter((e): e is T => !!e)
      .map((e) => ({ label: e.name, href: hrefFor(e) }));
    return { heading: section.heading, links };
  }
  return {
    heading: section.heading,
    links: liveEntities.slice(0, section.limit).map((e) => ({ label: e.name, href: hrefFor(e) })),
  };
}

export async function getMainNav(): Promise<MainNavItem[]> {
  const [{ items, shopByRoom, megaMenuCategories, megaMenuThemes }, categories, themes] = await Promise.all([
    getNavigationSettings(),
    getAllCategories(),
    getAllThemes(),
  ]);

  const shopByRoomLinks: NavLink[] = shopByRoom.enabled
    ? shopByRoom.links
        .filter((l) => l.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((l) => ({ label: l.label, href: l.href }))
    : [];

  const shopMegaMenu: MegaMenuColumn[] = [
    ...(shopByRoomLinks.length > 0 ? [{ heading: shopByRoom.heading, links: shopByRoomLinks }] : []),
    resolveMegaMenuColumn(megaMenuCategories, categories, (c) => `/categories/${c.slug}`),
    resolveMegaMenuColumn(megaMenuThemes, themes, (t) => `/themes/${t.slug}`),
  ];

  return items
    .filter((item) => item.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      label: item.label,
      href: item.href,
      ...(item.href === "/categories" ? { megaMenu: shopMegaMenu } : {}),
    }));
}

export async function getFooterNav(): Promise<{ heading: string; links: NavLink[] }[]> {
  const { columns } = await getFooterSettings();
  return columns
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((col) => ({
      heading: col.heading,
      links: col.links
        .filter((l) => l.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((l) => ({ label: l.label, href: l.href })),
    }));
}
