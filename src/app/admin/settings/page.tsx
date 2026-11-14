import Link from "next/link";
import { requireRole } from "@/lib/session";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { getReviewsEnabled } from "@/lib/settings/reviews";
import ReviewsToggle from "@/components/admin/reviews/ReviewsToggle";

const SETTINGS_LINKS = [
  { href: "/admin/settings/branding", label: "Branding", description: "Store name, tagline, logo, favicon, default SEO" },
  { href: "/admin/settings/product-page", label: "Product Page", description: "Which product-page sections render" },
  { href: "/admin/settings/shop", label: "Shop & Product Cards", description: "Filters, sort, per-page, card buttons" },
  { href: "/admin/settings/cart", label: "Cart", description: "Cart copy and coupon/recommendation visibility" },
  { href: "/admin/settings/checkout", label: "Checkout", description: "Checkout copy and payment-method offering" },
  { href: "/admin/settings/account", label: "Customer Account", description: "Account dashboard heading and optional tabs" },
];

/**
 * First real Store Settings hub — every subsection below reuses the exact
 * same Setting model + get/set helper pattern the Reviews module already
 * established. Deliberately not removing the Reviews toggle from
 * /admin/reviews (both read/write the identical Setting row via the
 * identical API route) — nothing about the existing Reviews admin page
 * changes.
 */
export default async function AdminSettingsPage() {
  await requireRole(SETTINGS_AREA_ROLES);
  const reviewsEnabled = await getReviewsEnabled();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Settings</h1>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg text-ink">Reviews</h2>
        <ReviewsToggle enabled={reviewsEnabled} />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="block border border-ink-100 bg-bone p-4 transition-colors hover:border-brass">
            <p className="font-display text-base text-ink">{link.label}</p>
            <p className="mt-1 text-xs text-ink-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
