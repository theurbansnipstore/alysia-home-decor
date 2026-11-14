import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data/products";
import { getSession } from "@/lib/session";
import { getReviewsEnabled } from "@/lib/settings/reviews";
import { isProductReviewsEnabled } from "@/lib/settings/product-reviews";
import { getProductPageSettings } from "@/lib/settings/product-page";
import { getReviewSummary, getUserReviewForProduct } from "@/lib/data/reviews";
import RatingDistribution from "@/components/products/RatingDistribution";
import Breadcrumb from "@/components/categories/Breadcrumb";
import ProductGallery from "@/components/products/ProductGallery";
import ProductInfo from "@/components/products/ProductInfo";
import RoomInspiration from "@/components/products/RoomInspiration";
import CraftsmanshipSection from "@/components/products/CraftsmanshipSection";
import RecentlyViewed from "@/components/products/RecentlyViewed";
import RecordRecentlyViewed from "@/components/products/RecordRecentlyViewed";
import StickyMobileBar from "@/components/products/StickyMobileBar";
import ProductRail from "@/components/home/ProductRail";
import ReviewList from "@/components/products/ReviewList";
import ReviewForm from "@/components/products/ReviewForm";
import { resolveProductSeo } from "@/lib/seo/resolve";
import { buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/site";
import JsonLd from "@/components/seo/JsonLd";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getProductBySlug(params.slug);
  if (!result) return {};
  const { product } = result;
  const seo = resolveProductSeo({
    name: product.name,
    description: product.description,
    seoTitle: product.seoTitle ?? null,
    seoDesc: product.seoDesc ?? null,
    status: product.status,
  });
  const urlPath = `/product/${product.slug}`;
  const primaryImage = product.images.primary?.url;

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: urlPath },
    robots: seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: urlPath,
      type: "website",
      ...(primaryImage ? { images: [{ url: primaryImage }] } : {}),
    },
    twitter: {
      card: primaryImage ? "summary_large_image" : "summary",
      title: seo.title,
      description: seo.description,
      ...(primaryImage ? { images: [primaryImage] } : {}),
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const result = await getProductBySlug(params.slug);
  // Unreachable in practice — this segment's layout.tsx (Module 33) already
  // resolves the not-found/redirect decision (with a real HTTP 404/308)
  // before page.tsx ever renders. Kept only so TypeScript can narrow
  // `result` below; the redirect logic itself lives in exactly one place
  // (layout.tsx), never duplicated here.
  if (!result) notFound();

  const { product, relatedProducts, similarCollections } = result;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const shareUrl = `${siteUrl}/product/${product.slug}`;

  const [session, reviewsEnabled, pageSettings, productReviewsEnabled] = await Promise.all([
    getSession(),
    getReviewsEnabled(),
    getProductPageSettings(),
    isProductReviewsEnabled(product.id),
  ]);
  const showReviews = reviewsEnabled && pageSettings.showRatingReviews && productReviewsEnabled;
  const [reviewSummary, existingReview] = await Promise.all([
    showReviews ? getReviewSummary(product.id) : Promise.resolve(null),
    showReviews && session ? getUserReviewForProduct(session.id, product.id) : Promise.resolve(null),
  ]);

  const productJsonLd = buildProductJsonLd({
    name: product.name,
    description: product.description,
    images: [product.images.primary.url.startsWith("http") ? product.images.primary.url : absoluteUrl(product.images.primary.url)],
    sku: product.sku,
    brand: product.brand ?? null,
    price: product.discountPrice || product.price,
    currency: "INR",
    inStock: product.stockAvailable > 0,
    urlPath: `/product/${product.slug}`,
    // Only when reviews are actually visible on this page and there's at
    // least one — never a rating claim the visitor can't also see.
    ...(showReviews && reviewSummary && reviewSummary.count > 0
      ? { aggregateRating: { average: reviewSummary.average, count: reviewSummary.count } }
      : {}),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", urlPath: "/" },
    { name: product.category.name, urlPath: `/categories/${product.category.slug}` },
    { name: product.name, urlPath: `/product/${product.slug}` },
  ]);

  return (
    <div className="pb-24 lg:pb-0">
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <RecordRecentlyViewed slug={product.slug} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            { label: product.category.name, href: `/categories/${product.category.slug}` },
            { label: product.name },
          ]}
        />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} productName={product.name} />
          <ProductInfo product={product} shareUrl={shareUrl} reviewSummary={reviewSummary} pageSettings={pageSettings} />
        </div>

        <RoomInspiration roomImage={product.images.room} productName={product.name} />
        {pageSettings.craftsmanship.enabled && (
          <CraftsmanshipSection
            image={pageSettings.craftsmanship.image}
            imageAlt={pageSettings.craftsmanship.title}
            title={pageSettings.craftsmanship.title}
            body={pageSettings.craftsmanship.body}
          />
        )}
        <RecentlyViewed />

        {showReviews && (
          <section id="reviews" className="mt-16 border-t border-ink-100 pt-12">
            <h2 className="mb-6 font-display text-2xl text-ink">Reviews</h2>
            {reviewSummary && (
              <RatingDistribution
                average={reviewSummary.average}
                count={reviewSummary.count}
                distribution={reviewSummary.distribution}
              />
            )}
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              <ReviewList productId={product.id} />
              <ReviewForm
                productId={product.id}
                isAuthenticated={!!session}
                existingReview={
                  existingReview
                    ? {
                        id: existingReview.id,
                        rating: existingReview.rating,
                        title: existingReview.title,
                        comment: existingReview.comment,
                      }
                    : null
                }
              />
            </div>
          </section>
        )}
      </div>

      {pageSettings.showRelatedProducts && relatedProducts.length > 0 && (
        <ProductRail
          title="You May Also Like"
          subtitle="More from this category"
          href={`/categories/${product.category.slug}`}
          products={relatedProducts}
        />
      )}

      {pageSettings.showRelatedProducts && product.theme && similarCollections.length > 0 && (
        <ProductRail
          title="Similar Collections"
          subtitle={`More from ${product.theme.name}`}
          href={`/themes/${product.theme.slug}`}
          products={similarCollections}
        />
      )}

      <StickyMobileBar
        productId={product.id}
        name={product.name}
        price={product.price}
        discountPrice={product.discountPrice}
        inStock={product.stockAvailable > 0}
      />
    </div>
  );
}
