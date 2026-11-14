"use client";

import { type MouseEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Check, AlertCircle } from "lucide-react";

/**
 * The small circular cart button used on ProductCard specifically — kept
 * as its own Client Component for the same reason as
 * ProductCardWishlistButton: ProductCard itself (used across the whole
 * site) stays a plain server-renderable component, only this button's own
 * render/interactivity ships to the client. Unlike the PDP's
 * AddToCartButton, this one deliberately does NOT navigate to /cart —
 * doing so on a listing grid would yank a browsing shopper off the page
 * on every click. It stays put and shows inline state instead, then
 * router.refresh()es so the Header's server-rendered cart badge updates
 * the same way AddToCartButton/StickyMobileBar already do.
 */
export default function ProductCardAddToCartButton({
  productId,
  inStock,
}: {
  productId: string;
  inStock: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // ProductCard's button sits inside the card's own <Link> — without
    // these, clicking it would also navigate to the product page.
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || state === "busy") return;

    setState("busy");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setState("error");
        setTimeout(() => setState("idle"), 2000);
        return;
      }
      setState("done");
      router.refresh();
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  const visibility = !inStock ? "opacity-60" : state === "idle" ? "opacity-100 md:opacity-0 md:group-hover:opacity-100" : "opacity-100";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!inStock || state === "busy"}
      aria-label={inStock ? "Add to cart" : "Out of stock"}
      className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-bone-100 text-ink shadow-sm transition-opacity disabled:cursor-not-allowed ${visibility}`}
    >
      {state === "done" ? (
        <Check size={16} className="text-sage-600" />
      ) : state === "error" ? (
        <AlertCircle size={16} className="text-clay" />
      ) : (
        <ShoppingBag size={16} />
      )}
    </button>
  );
}
