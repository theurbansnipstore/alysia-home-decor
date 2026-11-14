import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentCart } from "@/lib/cart/service";
import { getUserAddresses } from "@/lib/data/addresses";
import { computeOrderPricing } from "@/lib/checkout/pricing";
import { getAppliedCouponCode } from "@/lib/cart/coupon-cookie";
import { validateCoupon } from "@/lib/cart/coupons";
import Breadcrumb from "@/components/categories/Breadcrumb";
import CartReviewStep from "@/components/checkout/CartReviewStep";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import OrderSummary from "@/components/checkout/OrderSummary";
import { checkoutContent } from "@/lib/content/checkout";
import { getBrandSettings } from "@/lib/config/brand";
import { getCheckoutSettings } from "@/lib/settings/checkout";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: `Checkout — ${getBrandSettings().name}`,
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [session, items] = await Promise.all([getSession(), getCurrentCart()]);

  if (items.length === 0) {
    redirect("/cart");
  }

  const [savedAddresses, checkoutSettings, user] = await Promise.all([
    session ? getUserAddresses(session.id) : Promise.resolve([]),
    getCheckoutSettings(),
    // Freshly read, never from the JWT — codBlocked can change after login.
    session ? prisma.user.findUnique({ where: { id: session.id }, select: { codBlocked: true } }) : Promise.resolve(null),
  ]);
  const codBlockedForCustomer = user?.codBlocked ?? false;

  const subtotal = items.reduce(
    (sum, i) => sum + parseFloat(i.product.discountPrice || i.product.price) * i.quantity,
    0
  );
  const couponCode = getAppliedCouponCode();
  let discountAmount = 0;
  let freeShipping = false;
  if (couponCode) {
    const result = await validateCoupon(couponCode, subtotal);
    if (result.valid) {
      discountAmount = result.discountAmount ?? 0;
      freeShipping = result.freeShipping ?? false;
    }
  }

  const pricing = await computeOrderPricing(items, { discountAmount, freeShipping, paymentMethod: "COD" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl text-ink sm:text-4xl">{checkoutSettings.heading || checkoutContent.pageTitle}</h1>
        {!session && (
          <p className="text-sm text-ink-500">
            <Link href="/login?redirect=/checkout" className="text-brass-600 hover:text-brass">
              Sign in
            </Link>{" "}
            for faster checkout next time — your cart and coupon carry over automatically.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-6">
          <CartReviewStep items={items} />
          <CheckoutForm
            savedAddresses={savedAddresses}
            defaultEmail={session?.email}
            checkoutSettings={checkoutSettings}
            codBlockedForCustomer={codBlockedForCustomer}
          />
        </div>
        <div className="lg:w-96 lg:shrink-0">
          <OrderSummary pricing={pricing} />
        </div>
      </div>
    </div>
  );
}
