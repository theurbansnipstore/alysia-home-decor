import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Every literal first path segment already used by this app (Module 36
 * audit of src/app/*) plus "sitemap"/"robots" for their .xml/.txt routes.
 * CMS pages are routed at root (/[slug]) so this is the single, complete
 * blast radius — a Category/Theme/Product slug can never collide since
 * those live under their own prefixes (/categories/x, /themes/x,
 * /product/x), not at root. Kept as one explicit list, not derived from
 * the filesystem at runtime, so a reviewer can see the whole reserved set
 * in one place per Module 36's "centralized reserved-slug/path validation
 * mechanism" requirement.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "about",
  "account",
  "admin",
  "api",
  "careers",
  "cart",
  "categories",
  "checkout",
  "collections",
  "contact",
  "faq",
  "forgot-password",
  "login",
  "product",
  "register",
  "reset-password",
  "returns",
  "robots",
  "shipping",
  "shop",
  "sitemap",
  "themes",
  "wishlist",
];

const RESERVED_SET = new Set(RESERVED_SLUGS);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SET.has(slug.toLowerCase());
}

/**
 * A slug is available for a CMS page only if it isn't reserved and no
 * OTHER page currently owns it. `excludePageId` lets an update pass its
 * own id so saving a page without changing its slug isn't treated as a
 * collision with itself.
 */
export async function isPageSlugAvailable(slug: string, excludePageId?: string): Promise<boolean> {
  if (isReservedSlug(slug)) return false;
  const conflict = await prisma.page.findFirst({
    where: { slug, ...(excludePageId ? { id: { not: excludePageId } } : {}) },
    select: { id: true },
  });
  return !conflict;
}
