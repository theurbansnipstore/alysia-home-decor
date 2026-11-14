import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Generic read/write for the Setting model (key/value Json, one row per
 * concern) — the same mechanism src/lib/settings/reviews.ts already
 * proved out. Every store_* settings file in this directory is a thin,
 * typed wrapper around these two functions; this file holds the only
 * Prisma calls so there's exactly one place that touches the Setting
 * table's read/write mechanics.
 *
 * No row for a key = that key was never configured = the caller's
 * default is used untouched. This is what guarantees every new settings
 * domain reproduces today's exact behavior until an admin actually saves
 * a change.
 *
 * Module 37: a row CAN exist but predate a field a later module added to
 * that domain's interface (e.g. store_navigation was saved by an admin
 * before Part 11 added shopByRoom) — a bare `row.value as T` would then
 * silently return an object missing that field at runtime despite T
 * claiming it's always present, crashing the first thing that reads it
 * (found live: Header 500s reading shopByRoom.enabled off a real,
 * pre-existing store_navigation row). Every settings domain in this
 * directory stores a plain top-level object (confirmed — the one
 * exception, reviews.ts's raw boolean, calls prisma directly and never
 * goes through this function), so a shallow merge of the default UNDER
 * the stored value is safe everywhere: any key an admin has genuinely
 * saved wins, any key that didn't exist yet when they saved falls back to
 * its default, exactly as if that key had also been "never configured".
 */
/**
 * Module 40 Part 1/7 — wrapped in React's cache() so the many settings
 * domains that get read from more than one component in the same render
 * pass (found live: getResolvedBrandSettings() — itself reading
 * store_branding via this function — is called independently from
 * src/app/layout.tsx, Header.tsx, AND Footer.tsx; every settings-backed
 * page does something similar to a smaller degree) collapse to one DB read
 * per key per request instead of one per call site. This is the same
 * pattern src/lib/settings/shop.ts's getShopSettings() already used
 * (Module 34) — applying it here, at the one shared chokepoint every
 * settings domain funnels through, extends that benefit to all of them at
 * once rather than file-by-file. Safe to cache: this is public, non-
 * personalized store configuration — never per-user, never cart/order/
 * payment data (none of which is ever read through this function).
 */
export const getStoreSetting = cache(async function getStoreSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return defaultValue;
  return { ...(defaultValue as object), ...(row.value as object) } as T;
});

export async function setStoreSetting<T>(key: string, value: T): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as object },
    create: { key, value: value as object },
  });
}
