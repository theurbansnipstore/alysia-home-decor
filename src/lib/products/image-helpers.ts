import type { ProductImageDTO, ProductImageSet } from "@/types";

// Deliberately NOT server-only — these are pure functions (no DB access),
// safe to import from both Server and Client Components. Product DB
// queries stay in src/lib/data/products.ts, which re-exports these two
// functions for backward compatibility with existing Server Component
// imports.

const FALLBACK_IMAGE: ProductImageDTO = {
  id: "fallback",
  url: "/patterns/jali.svg",
  altText: "Product image not yet available",
};

export function resolveProductImageSet(images: ProductImageDTO[]): ProductImageSet {
  const gallery = images.length > 0 ? images : [FALLBACK_IMAGE];
  const primary = gallery[0];

  // "See it styled" (RoomInspiration, the only consumer of `.room`) prefers
  // an image an admin explicitly tagged LIFESTYLE (Module 11's ImagePurpose)
  // over the old positional convention (3rd gallery image), so it stops
  // depending on upload order. Falls back to the position for products
  // whose images predate tagging, so nothing regresses for them.
  const taggedLifestyle = gallery.find((img) => img.purpose === "LIFESTYLE");

  return {
    primary,
    gallery,
    lifestyle: gallery[1] ?? null,
    room: taggedLifestyle ?? gallery[2] ?? null,
    zoom: primary,
    thumbnail: primary,
  };
}

export function getProductImageUrl(images: ProductImageDTO[]): string {
  return resolveProductImageSet(images).primary.url;
}
