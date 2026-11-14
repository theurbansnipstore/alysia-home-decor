import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Theme } from "@prisma/client";
import type { ThemeDTO } from "@/types";

function toThemeDTO(theme: Theme): ThemeDTO {
  return {
    id: theme.id,
    name: theme.name,
    slug: theme.slug,
    banner: theme.banner,
    description: theme.description,
    isEnabled: theme.isEnabled,
  };
}

/**
 * All enabled themes, sorted for display. Read-only. Module 40 Part 1 —
 * cache()-wrapped for the same reason as getAllCategories() above (the
 * Header mega-menu + a page's own grid both call this independently within
 * one request; confirmed live via query logging).
 */
export const getAllThemes = cache(async function getAllThemes(): Promise<ThemeDTO[]> {
  const themes = await prisma.theme.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: "asc" },
  });
  return themes.map(toThemeDTO);
});

/**
 * Metadata lookup only — no products. The /themes/[slug] page pairs this
 * with getProductCatalog({ themeSlug: slug, ... }) from
 * src/lib/data/catalog.ts for the product list (Module 7 consolidation).
 */
export async function getThemeBySlug(slug: string): Promise<ThemeDTO | null> {
  const theme = await prisma.theme.findUnique({ where: { slug } });
  if (!theme || !theme.isEnabled) return null;
  return toThemeDTO(theme);
}

/** All themes regardless of isEnabled — for admin selects. */
export async function getAllThemesAdmin(): Promise<ThemeDTO[]> {
  const themes = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });
  return themes.map(toThemeDTO);
}
