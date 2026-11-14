import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/data/products";
import { BADGE_FILTERS } from "@/lib/config/catalog";
import ProductCardWishlistButton from "@/components/ui/ProductCardWishlistButton";
import ProductCardAddToCartButton from "@/components/ui/ProductCardAddToCartButton";
import StarRating from "@/components/products/StarRating";
import { getShopSettings } from "@/lib/settings/shop";
import { getReviewsEnabled } from "@/lib/settings/reviews";
import type { ProductCardDTO } from "@/types";

/**
 * Async — reads store_shop's card-button visibility itself rather than
 * threading it through every call site (shop/categories/themes/home
 * rails/wishlist/cart-recommendations, 8+ places). getShopSettings() is
 * request-memoized (React cache()) so this doesn't add a redundant DB
 * read per card.
 */
export default async function ProductCard({ product }: { product: ProductCardDTO }) {
  const [shopSettings, reviewsEnabled] = await Promise.all([getShopSettings(), getReviewsEnabled()]);
  const image = getProductImageUrl(product.images);
  const hasDiscount = !!product.discountPrice;
  const inStock = (product.stockAvailable ?? 0) > 0;
  const showRating = shopSettings.showRatingOnCards && reviewsEnabled && !!product.rating && product.rating.count > 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-bone-200 shadow-sm transition-shadow duration-300 group-hover:shadow-card">
        <Image
          src={image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {shopSettings.showWishlistOnCards && <ProductCardWishlistButton productId={product.id} />}
        {shopSettings.showAddToCartOnCards && <ProductCardAddToCartButton productId={product.id} inStock={inStock} />}
        {product.isNewArrival && (
          <span className="absolute left-3 top-3 rounded-sm bg-ink px-2 py-1 text-[10px] uppercase tracking-widest text-bone-100">
            {BADGE_FILTERS.newArrival.ribbonLabel}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="font-body text-sm text-charcoal">{product.name}</h3>
        {showRating && product.rating && (
          <div className="flex items-center gap-1.5 text-xs text-ink-500">
            <StarRating rating={product.rating.average} size={12} />
            <span>
              {product.rating.average.toFixed(1)} ({product.rating.count})
            </span>
          </div>
        )}
        <div className="flex items-baseline gap-2 font-mono text-sm">
          <span className={hasDiscount ? "text-clay" : "text-ink"}>
            {formatPrice(hasDiscount ? product.discountPrice! : product.price)}
          </span>
          {hasDiscount && <span className="text-ink-300 line-through">{formatPrice(product.price)}</span>}
        </div>
      </div>
    </Link>
  );
}
