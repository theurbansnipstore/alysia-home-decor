import ProductBadges from "@/components/products/ProductBadges";
import ProductSpecTable from "@/components/products/ProductSpecTable";
import ProductPolicyAccordion from "@/components/products/ProductPolicyAccordion";
import PurchasePanel from "@/components/products/PurchasePanel";
import ShareButtons from "@/components/products/ShareButtons";
import ReviewSummary from "@/components/products/ReviewSummary";
import { formatPrice } from "@/lib/utils";
import type { ProductDetailDTO } from "@/types";
import type { ProductPageSettings } from "@/lib/settings/product-page";

interface ProductInfoProps {
  product: ProductDetailDTO;
  shareUrl: string;
  reviewSummary: { average: number; count: number } | null;
  pageSettings: ProductPageSettings;
}

export default function ProductInfo({ product, shareUrl, reviewSummary, pageSettings }: ProductInfoProps) {
  const hasDiscount = !!product.discountPrice;
  const inStock = product.stockAvailable > 0;

  return (
    <div>
      <ProductBadges badges={pageSettings.badges} />

      <h1 className="mt-4 font-display text-3xl text-ink sm:text-4xl">{product.name}</h1>

      {pageSettings.showRatingReviews && reviewSummary && <ReviewSummary average={reviewSummary.average} count={reviewSummary.count} />}

      <div className="mt-3 flex items-baseline gap-3 font-mono text-xl">
        <span className={hasDiscount ? "text-clay" : "text-ink"}>
          {formatPrice(hasDiscount ? product.discountPrice! : product.price)}
        </span>
        {hasDiscount && <span className="text-ink-300 line-through">{formatPrice(product.price)}</span>}
      </div>

      <p className="mt-2 text-xs text-ink-500">
        {inStock ? `${product.stockAvailable} in stock` : "Currently out of stock"}
        <span className="ml-2 text-ink-300">SKU: {product.sku}</span>
      </p>

      <p className="mt-6 max-w-prose text-sm leading-relaxed text-ink-500">{product.description}</p>

      <div className="mt-8">
        <PurchasePanel
          productId={product.id}
          maxQuantity={Math.min(10, product.stockAvailable)}
          inStock={inStock}
          showBuyItNow={pageSettings.showBuyItNow}
          showWishlist={pageSettings.showWishlist}
        />
      </div>

      <div className="mt-4">
        <ShareButtons title={product.name} url={shareUrl} />
      </div>

      {pageSettings.showSpecifications && product.attributes.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 font-display text-lg text-ink">Specifications</h2>
          <ProductSpecTable attributes={product.attributes} />
        </div>
      )}

      {pageSettings.showPolicyInfo && (
        <div className="mt-10">
          <ProductPolicyAccordion policies={pageSettings.policies} returnPolicyOverride={product.returnPolicy} />
        </div>
      )}
    </div>
  );
}
