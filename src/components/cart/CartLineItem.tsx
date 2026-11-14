"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/products/image-helpers";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/config/cart";
import type { ProductCardDTO } from "@/types";

interface CartLineItemProps {
  productId: string;
  quantity: number;
  product: ProductCardDTO;
}

export default function CartLineItem({ productId, quantity, product }: CartLineItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localQuantity, setLocalQuantity] = useState(quantity);

  const image = getProductImageUrl(product.images);
  const unitPrice = parseFloat(product.discountPrice || product.price);

  function updateQuantity(next: number) {
    const clamped = Math.min(MAX_QUANTITY_PER_ITEM, Math.max(0, next));
    setLocalQuantity(clamped);
    startTransition(async () => {
      await fetch(`/api/cart/items/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: clamped }),
      });
      router.refresh();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await fetch(`/api/cart/items/${productId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 border-b border-ink-100 py-6">
      <Link href={`/product/${product.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-bone-200">
        <Image src={image} alt={product.name} fill className="object-cover" sizes="96px" />
      </Link>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/product/${product.slug}`} className="font-body text-sm text-charcoal hover:text-brass-600">
              {product.name}
            </Link>
            <p className="mt-1 font-mono text-sm text-ink">{formatPrice(unitPrice)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Remove ${product.name} from cart`}
            disabled={isPending}
            className="text-ink-300 transition-colors hover:text-clay disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="inline-flex items-center border border-ink-100">
            <button
              type="button"
              onClick={() => updateQuantity(localQuantity - 1)}
              disabled={isPending || localQuantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-9 w-9 items-center justify-center text-ink-700 disabled:pointer-events-none disabled:text-ink-300"
            >
              −
            </button>
            <span className="w-8 text-center text-sm" aria-live="polite">
              {localQuantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(localQuantity + 1)}
              disabled={isPending || localQuantity >= MAX_QUANTITY_PER_ITEM}
              aria-label="Increase quantity"
              className="flex h-9 w-9 items-center justify-center text-ink-700 disabled:pointer-events-none disabled:text-ink-300"
            >
              +
            </button>
          </div>
          <p className="font-mono text-sm text-ink">{formatPrice(unitPrice * localQuantity)}</p>
        </div>
      </div>
    </div>
  );
}
