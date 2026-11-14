import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Product, ProductImage, ProductAttribute } from "@prisma/client";
import type { ProductCardDTO, ProductDetailDTO } from "@/types";
import { resolveProductImageSet, getProductImageUrl } from "@/lib/products/image-helpers";

// Re-exported for backward compatibility — every existing import of these
// from "@/lib/data/products" keeps working unchanged. New client-side code
// (e.g. Module 8's cart components) should import them directly from
// "@/lib/products/image-helpers" instead, since that file has no
// server-only restriction.
export { resolveProductImageSet, getProductImageUrl };

type ProductWithImages = Product & { images: ProductImage[] };
type ProductWithRelations = Product & {
  images: ProductImage[];
  attributes: ProductAttribute[];
  category: { name: string; slug: string };
  theme: { name: string; slug: string } | null;
};

export function toProductCardDTO(product: ProductWithImages): ProductCardDTO {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price.toString(),
    discountPrice: product.discountPrice ? product.discountPrice.toString() : null,
    images: product.images.map((img) => ({ id: img.id, url: img.url, altText: img.altText })),
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    stockAvailable: product.stockAvailable,
  };
}

function toProductDetailDTO(product: ProductWithRelations): ProductDetailDTO {
  const images = product.images.map((img) => ({ id: img.id, url: img.url, altText: img.altText, purpose: img.purpose }));
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    attributes: product.attributes
      .filter((a) => a.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => ({ id: a.id, label: a.label, value: a.value })),
    returnPolicy: product.returnPolicyOverride ?? null,
    price: product.price.toString(),
    discountPrice: product.discountPrice ? product.discountPrice.toString() : null,
    sku: product.sku,
    brand: product.brand,
    dimensions: product.dimensions,
    weightGrams: product.weightGrams,
    tags: product.tags ? product.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    stockAvailable: product.stockAvailable,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    isFeatured: product.isFeatured,
    images: resolveProductImageSet(images),
    category: product.category,
    theme: product.theme,
    status: product.status,
    seoTitle: product.seoTitle,
    seoDesc: product.seoDesc,
  };
}

/**
 * Module 40 Part 1 — wrapped in React's cache() because
 * src/app/product/[slug]/page.tsx calls this once from generateMetadata()
 * and again from the page component itself for the same request (the
 * standard Next.js pattern of deriving metadata from the same data the
 * page renders) — without cache(), that's the full product query
 * (including its images/attributes/category/theme joins) run twice per
 * page load, confirmed live via Prisma query logging during this module's
 * performance audit. Safe to cache: public catalog data, not per-user.
 */
export const getProductBySlug = cache(async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      attributes: { orderBy: { sortOrder: "asc" } },
      category: { select: { name: true, slug: true } },
      theme: { select: { name: true, slug: true } },
    },
  });

  if (!product || product.status !== "ACTIVE") return null;

  const [relatedProducts, similarCollections] = await Promise.all([
    prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, status: "ACTIVE" },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 4,
    }),
    product.themeId
      ? prisma.product.findMany({
          where: { themeId: product.themeId, id: { not: product.id }, status: "ACTIVE" },
          include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          take: 4,
        })
      : Promise.resolve([]),
  ]);

  return {
    product: toProductDetailDTO(product as ProductWithRelations),
    relatedProducts: relatedProducts.map(toProductCardDTO),
    similarCollections: similarCollections.map(toProductCardDTO),
  };
});

/**
 * Module 32 — only ever called after getProductBySlug() has already missed,
 * so this never adds a query to the normal (current-slug) request path.
 * Returns the product's CURRENT slug (not the stored row itself), so a
 * multi-step slug history collapses to a single redirect with no chain.
 */
export async function getProductRedirectSlug(slug: string): Promise<string | null> {
  const redirect = await prisma.productSlugRedirect.findUnique({
    where: { oldSlug: slug },
    select: { product: { select: { slug: true } } },
  });
  return redirect?.product.slug ?? null;
}
