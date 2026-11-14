import type { Metadata } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getBrandSettings } from "@/lib/config/brand";
import { getSiteUrl } from "@/lib/seo/site";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/jsonld";
import { getSocialSettings } from "@/lib/settings/social";
import { getSiteSeoDefaults } from "@/lib/settings/branding";
import JsonLd from "@/components/seo/JsonLd";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const brand = getBrandSettings();
const siteUrl = getSiteUrl();

/**
 * metadataBase (Module 31) resolves every relative `alternates.canonical`
 * and relative OG/Twitter image path used across the app into an absolute
 * URL — without it, Next.js falls back to inferring the deploy URL, which
 * is unreliable in production. Site-wide OG/Twitter defaults here are
 * inherited by any page that doesn't set its own (Next.js metadata
 * merging), so every page gets a sane social-share fallback even before
 * per-page work.
 *
 * Module 36: converted from a static `export const metadata` object to
 * `generateMetadata()` so the title/description/OG image can come from
 * BrandingSettings.seoDefaultTitle/seoDefaultDescription/ogImageUrl (Setting-
 * backed, admin-editable at /admin/settings/branding) when an admin has set
 * them, falling back to the exact same static strings this file used
 * before — an unconfigured store's <head> is unchanged.
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeoDefaults();

  return {
    metadataBase: new URL(siteUrl),
    // No `template` here deliberately — every existing page in this project
    // (cart, checkout, login, product, category, ...) already builds its own
    // complete title including the brand suffix itself. A template would
    // silently double-suffix every one of them (e.g. "X — Elysia | Elysia"),
    // not just this module's new pages — found and fixed during this
    // module's own live QA. `default` still covers the rare page that sets
    // no title at all.
    title: seo.title,
    description: seo.description,
    icons: { icon: brand.faviconUrl },
    openGraph: {
      siteName: brand.name,
      title: seo.title,
      description: seo.description,
      url: "/",
      type: "website",
      images: [{ url: seo.ogImage, width: brand.logoWidth, height: brand.logoHeight }],
    },
    twitter: {
      card: "summary",
      title: seo.title,
      description: seo.description,
    },
    // Search-console ownership verification (Module 33) — opt-in via env var,
    // omitted entirely when unset rather than emitting an empty/placeholder
    // meta tag. Set GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION to the
    // real code from Google Search Console / Bing Webmaster Tools.
    ...(process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION
      ? {
          verification: {
            ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
            ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
          },
        }
      : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const social = await getSocialSettings();
  const organizationJsonLd = buildOrganizationJsonLd({
    name: brand.name,
    logoPath: brand.logoUrl,
    sameAs: social.links.filter((l) => l.enabled && l.url).map((l) => l.url),
  });
  const websiteJsonLd = buildWebsiteJsonLd({ name: brand.name, searchPath: "/shop?q=" });

  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
