import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo/site";

/**
 * Native Next.js App Router sitemap (Module 31 Part 11) — no third-party
 * sitemap package added, no manually maintained static file. Generated at
 * request time from real DB content: ACTIVE products, visible categories,
 * enabled themes. Deliberately excludes admin/account/cart/checkout/login/
 * register/api/private routes (Part 11's explicit list) simply by never
 * listing them — there's no "exclude" mechanism to get wrong.
 *
 * lastModified is included for products (real data — Product has an
 * `updatedAt` column, maintained by Prisma's `@updatedAt`). Category and
 * Theme have no `updatedAt` column today (Module 33 audit confirmed this;
 * only Product got one), and reusing `createdAt` for something that may
 * since have been edited would be a fabricated signal, not a real one —
 * omitting stays the honest choice for those two (lastModified is optional
 * in the sitemap spec).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const [products, categories, themes, pages] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isVisible: true }, select: { slug: true } }),
    prisma.theme.findMany({ where: { isEnabled: true }, select: { slug: true } }),
    // Module 36: published CMS pages only — draft/deleted pages are simply
    // absent from this query, so they can never appear here.
    prisma.page.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/themes`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/collections`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/faq`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/returns`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/shipping`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/careers`, changeFrequency: "monthly", priority: 0.2 },
  ];

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/product/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/categories/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const themePages: MetadataRoute.Sitemap = themes.map((t) => ({
    url: `${siteUrl}/themes/${t.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const cmsPages: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${siteUrl}/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...themePages, ...cmsPages];
}
