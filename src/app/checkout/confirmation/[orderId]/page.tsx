import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getOrderById } from "@/lib/checkout/order-service";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { checkoutContent } from "@/lib/content/checkout";
import { getBrandSettings } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Order Confirmed — ${getBrandSettings().name}`,
  // Every other private/per-user page in the app sets this explicitly
  // (login, cart, checkout, wishlist, account) — this one relied on the
  // robots.txt "/checkout" disallow alone, which is a crawl hint, not an
  // indexing directive (Module 33; same distinction robots.ts itself
  // documents).
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({ params }: { params: { orderId: string } }) {
  const order = await getOrderById(params.orderId);
  if (!order) notFound();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-600">
        <CheckCircle2 size={30} aria-hidden />
      </div>

      <h1 className="mb-3 font-display text-3xl text-ink sm:text-4xl">{checkoutContent.orderSuccessTitle}</h1>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-ink-500">
        {checkoutContent.orderSuccessDescription(order.orderNumber)}
      </p>

      <div className="mb-8 w-full max-w-sm border border-ink-100 bg-bone-100 p-5 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-ink-500">Order Number</span>
          <span className="font-mono text-ink">{order.orderNumber}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-ink-500">Total</span>
          <span className="font-mono text-ink">{formatPrice(order.total.toString())}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-ink-500">Payment Method</span>
          <span className="text-ink">{order.paymentMethod}</span>
        </div>
      </div>

      <Link href="/shop">
        <Button type="button" variant="primary">
          {checkoutContent.continueShoppingCta}
        </Button>
      </Link>
    </div>
  );
}
