import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buildCartSnapshot } from "@/lib/cart/service";
import { getProductCatalog } from "@/lib/data/catalog";
import Breadcrumb from "@/components/categories/Breadcrumb";
import CartLineItem from "@/components/cart/CartLineItem";
import CartSummary from "@/components/cart/CartSummary";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import ProductRail from "@/components/home/ProductRail";
import { cartContent } from "@/lib/content/cart";
import { getBrandSettings } from "@/lib/config/brand";
import { getCartSettings } from "@/lib/settings/cart";
import { getShippingSettings } from "@/lib/settings/shipping";

export const metadata: Metadata = {
  title: `Your Cart — ${getBrandSettings().name}`,
  description: "Review the items in your cart.",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: { added?: string };
}

export default async function CartPage({ searchParams }: Props) {
  const [{ items, totals, appliedCoupon }, cartSettings, shippingSettings] = await Promise.all([
    buildCartSnapshot(),
    getCartSettings(),
    getShippingSettings(),
  ]);
  const justAdded = searchParams.added === "1" && items.length > 0;

  // "Similar Products" — the honest fallback for Recently Viewed, which
  // only has recording architecture (Module 6/9.5) and no display UI yet.
  const cartProductIds = new Set(items.map((i) => i.productId));
  const { products: similarProducts } =
    items.length > 0 && cartSettings.showRecommendations
      ? await getProductCatalog({ sort: "best_selling", pageSize: 8 })
      : { products: [] };
  const filteredSimilar = similarProducts.filter((p) => !cartProductIds.has(p.id)).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />

      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink sm:text-4xl">{cartSettings.heading || cartContent.pageTitle}</h1>
        {items.length > 0 && (
          <Link href="/shop" className="hidden text-sm text-ink-500 hover:text-brass-600 sm:block">
            Continue Shopping →
          </Link>
        )}
      </div>

      {justAdded && (
        <p
          role="status"
          className="mb-6 flex items-center gap-2 border border-sage-600/40 bg-sage-100 px-4 py-3 text-sm text-sage-600"
        >
          <CheckCircle2 size={16} aria-hidden />
          Added to your cart.
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          title={cartSettings.emptyTitle || cartContent.emptyTitle}
          description={cartSettings.emptyDescription || cartContent.emptyDescription}
          action={
            <Link href="/shop">
              <Button type="button" variant="primary">
                {cartSettings.continueShoppingText || cartContent.emptyCta}
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-10 lg:flex-row">
            <div className="flex-1">
              {items.map((item) => (
                <CartLineItem
                  key={item.productId}
                  productId={item.productId}
                  quantity={item.quantity}
                  product={item.product}
                />
              ))}
              <div className="mt-6 flex flex-wrap gap-4 sm:hidden">
                <Link href="/shop" className="text-sm text-ink-500 hover:text-brass-600">
                  Continue Shopping →
                </Link>
              </div>
            </div>
            <div className="lg:w-96 lg:shrink-0">
              <CartSummary
                totals={totals}
                appliedCoupon={appliedCoupon}
                showCoupon={cartSettings.showCoupon}
                freeShippingThreshold={shippingSettings.freeShippingThreshold}
                freeShippingEnabled={shippingSettings.freeShippingEnabled}
              />
            </div>
          </div>

          {filteredSimilar.length > 0 && (
            <div className="mt-4 border-t border-ink-100">
              <ProductRail title="You May Also Like" href="/shop?sort=best_selling" products={filteredSimilar} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
