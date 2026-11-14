export interface BrandSettings {
  name: string;
  tagline: string;
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  faviconUrl: string;
  emailLogoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  themeColor: string;
}

/**
 * Single source of brand identity — name, logo, colors. Every
 * page/component that needs any of these reads from here, never
 * hardcodes "Elysia" or a color hex directly. Module 13+'s Admin
 * Dashboard eventually swaps this static object for a database-backed
 * settings read; nothing that calls getBrandSettings() needs to change
 * when that happens — same shape, different data source.
 */
export function getBrandSettings(): BrandSettings {
  return {
    name: "Elysia",
    tagline: "Handcrafted Home Decor",
    logoUrl: "/logo.svg",
    logoWidth: 140,
    logoHeight: 31,
    faviconUrl: "/icon.svg",
    emailLogoUrl: "/logo.svg",
    primaryColor: "#1F2E28",
    secondaryColor: "#B08D57",
    themeColor: "#1F2E28",
  };
}
