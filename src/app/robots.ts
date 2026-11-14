import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

/**
 * Native Next.js App Router robots config (Module 31 Part 12). Disallows
 * exactly the private/non-indexable route prefixes this app actually has
 * (admin, account, auth flows, cart, checkout, api) — matching real
 * routing, not a guessed list. This is a crawling hint only, never a
 * security boundary (Part 12's explicit warning) — every one of these
 * routes is already independently protected by requireRole()/
 * requireApiRole()/middleware.ts regardless of what robots.txt says.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/cart", "/checkout", "/login", "/register", "/forgot-password", "/reset-password", "/wishlist"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
