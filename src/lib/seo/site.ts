import "server-only";

/**
 * Single source of the real, deployed site origin (Module 31). Reads
 * NEXT_PUBLIC_SITE_URL — the same env var product/[slug]/page.tsx already
 * uses for its share URL — never a second, competing source of truth. The
 * "http://localhost:3000" fallback only ever applies when the env var is
 * genuinely unset (local dev with a bare .env.example copy); it is not a
 * hardcoded production value, and NEXT_PUBLIC_SITE_URL is documented in
 * .env.example as required for production. No trailing slash.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
