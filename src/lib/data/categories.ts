import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Category } from "@prisma/client";
import type { CategoryDTO } from "@/types";

function toCategoryDTO(category: Category): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image,
    description: category.description,
    seoTitle: category.seoTitle,
    seoDesc: category.seoDesc,
    isVisible: category.isVisible,
  };
}

/**
 * All visible categories, sorted for display (nav, listing page). Read-only.
 * Module 40 Part 1 — cache()-wrapped: the Header's mega-menu (present on
 * every storefront page, via getMainNav()) and a page's own grid
 * (/categories, /collections, /shop's filter sidebar) each call this
 * independently — confirmed live (query logging showed 2 identical Category
 * queries per /categories page load before this fix).
 */
export const getAllCategories = cache(async function getAllCategories(): Promise<CategoryDTO[]> {
  const categories = await prisma.category.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
  });
  return categories.map(toCategoryDTO);
});

/**
 * Metadata lookup only — no products. The /categories/[slug] page pairs
 * this with getProductCatalog({ categorySlug: slug, ... }) from
 * src/lib/data/catalog.ts for the product list, rather than this file
 * maintaining its own separate product query (Module 7 consolidation —
 * see PROJECT_DECISIONS.md).
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryDTO | null> {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category || !category.isVisible) return null;
  return toCategoryDTO(category);
}

/** All categories regardless of visibility — for admin selects, where hidden
 *  categories must still be assignable to a product. */
export async function getAllCategoriesAdmin(): Promise<CategoryDTO[]> {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return categories.map(toCategoryDTO);
}

/** Admin lookup by id, regardless of visibility (Module 31's category SEO screen — mirrors getAllCategoriesAdmin's "any visibility" rule). */
export async function getCategoryByIdAdmin(id: string): Promise<CategoryDTO | null> {
  const category = await prisma.category.findUnique({ where: { id } });
  return category ? toCategoryDTO(category) : null;
}
