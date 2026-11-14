export interface ProductImageDTO {
  id: string;
  url: string;
  altText?: string | null;
  purpose?: "PRODUCT" | "LIFESTYLE" | "DETAIL";
}

export interface ProductCardDTO {
  id: string;
  name: string;
  slug: string;
  price: string;
  discountPrice?: string | null;
  images: ProductImageDTO[];
  isNewArrival: boolean;
  isBestSeller: boolean;
  // Optional: real catalog reads always populate this (toProductCardDTO).
  // Left optional rather than required so the Razorpay finalize shim
  // (a protected file — see razorpay-finalize.ts) that builds a synthetic,
  // never-rendered ProductCardDTO purely for pricing-math reuse keeps
  // compiling without being touched.
  stockAvailable?: number;
  // Optional, populated only by listing pages that batch-fetch ratings
  // (getRatingSummariesForProducts — one query per page, not per card) and
  // merge them in before rendering. Absent = card renders without a
  // rating line, same as today.
  rating?: { average: number; count: number };
}

// Components consume this structured shape rather than the raw flat
// Product.images array. When a real `role` column is eventually added to
// ProductImage (schema currently has just url/altText/sortOrder), only
// resolveProductImageSet() in src/lib/data/products.ts needs to change —
// no component that consumes ProductImageSet does.
export interface ProductImageSet {
  primary: ProductImageDTO;
  gallery: ProductImageDTO[];
  lifestyle: ProductImageDTO | null;
  room: ProductImageDTO | null;
  zoom: ProductImageDTO;
  thumbnail: ProductImageDTO;
}

export interface ProductAttributeDTO {
  id: string;
  label: string;
  value: string;
}

export interface ProductDetailDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  attributes: ProductAttributeDTO[];
  returnPolicy: string | null;
  price: string;
  discountPrice?: string | null;
  sku: string;
  brand?: string | null;
  dimensions?: string | null;
  weightGrams?: number | null;
  tags: string[];
  stockAvailable: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  images: ProductImageSet;
  category: { name: string; slug: string };
  theme: { name: string; slug: string } | null;
  status: string;
  seoTitle?: string | null;
  seoDesc?: string | null;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDesc?: string | null;
  isVisible?: boolean;
}

export interface ThemeDTO {
  id: string;
  name: string;
  slug: string;
  banner?: string | null;
  description?: string | null;
  isEnabled?: boolean;
}

export interface HeroSlideDTO {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  imageAlt: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

export interface TestimonialDTO {
  id: string;
  name: string;
  location?: string;
  quote: string;
  rating: number;
}

export interface InstagramPostDTO {
  id: string;
  image: string;
  alt: string;
  link: string;
}

export interface TrustBadgeDTO {
  id: string;
  icon: string;
  label: string;
}

export interface NavLink {
  label: string;
  href: string;
}
