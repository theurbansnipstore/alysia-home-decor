import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/products/image-helpers";
import { checkoutContent } from "@/lib/content/checkout";
import type { CartLineItemDTO } from "@/lib/data/cart";

export default function CartReviewStep({ items }: { items: CartLineItemDTO[] }) {
  return (
    <section className="border border-ink-100 bg-bone-100 p-5 sm:p-6">
      <h2 className="mb-4 font-display text-lg text-ink">{checkoutContent.cartReviewTitle}</h2>
      <div className="divide-y divide-ink-100">
        {items.map((item) => {
          const image = getProductImageUrl(item.product.images);
          const unitPrice = parseFloat(item.product.discountPrice || item.product.price);
          return (
            <div key={item.productId} className="flex items-center gap-4 py-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-bone-200">
                <Image src={image} alt={item.product.name} fill className="object-cover" sizes="64px" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-charcoal">{item.product.name}</p>
                <p className="text-xs text-ink-500">Qty {item.quantity}</p>
              </div>
              <p className="font-mono text-sm text-ink">{formatPrice(unitPrice * item.quantity)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
