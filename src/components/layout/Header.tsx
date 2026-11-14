import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, LayoutDashboard } from "lucide-react";
import { getSession } from "@/lib/session";
import { getMainNav } from "@/lib/config/navigation";
import { getCartCount } from "@/lib/cart/service";
import { getWishlistCount } from "@/lib/wishlist/service";
import { getResolvedBrandSettings } from "@/lib/settings/branding";
import { getDefaultAdminHref } from "@/lib/admin/default-admin-route";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import DesktopNav from "@/components/layout/DesktopNav";
import MobileNavToggle from "@/components/layout/MobileNavToggle";
import SearchBar from "@/components/layout/SearchBar";
import UserMenu from "@/components/layout/UserMenu";

export default async function Header() {
  const [session, mainNav, cartCount, wishlistCount, brand] = await Promise.all([
    getSession(),
    getMainNav(),
    getCartCount(),
    getWishlistCount(),
    getResolvedBrandSettings(),
  ]);

  const adminHref = session ? getDefaultAdminHref(session.role) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-bone/95 backdrop-blur">
      <AnnouncementBar />
      <div className="relative mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/*
          Mobile/tablet compact row (below lg). Kept as its own layout
          rather than reusing the desktop grid's DOM nodes, since Admin no
          longer appears as a header icon at all on mobile — it lives
          inside MobileNavToggle's drawer instead. Left cluster is fixed
          (Menu, Logo); a flexible spacer fills the middle; the right
          cluster reveals Search as width allows, but Cart/Account/Sign out
          are never hidden, per priority order:
          Menu > Logo > Cart > Account > Sign out > Search.
        */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <MobileNavToggle links={mainNav} adminHref={adminHref} />
            <Link href="/" aria-label={`${brand.name} — Home`} className="relative h-9 w-28 shrink-0">
              <Image src={brand.logoUrl} alt={brand.name} fill priority sizes="112px" className="object-contain object-left" />
            </Link>
          </div>

          <div className="min-w-0 flex-1" />

          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden min-[400px]:block">
              <SearchBar />
            </span>
            <Link
              href="/cart"
              aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
              className="relative shrink-0 text-ink-700 transition-colors hover:text-brass-600"
            >
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-[10px] font-medium text-bone"
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <UserMenu session={session} compactLogout />
          </div>
        </div>

        {/*
          Desktop three-zone grid (lg and up) — unchanged from the previous
          fix: [1fr] [auto] [1fr]. The center track sizes itself to the
          nav's own content and the two 1fr side tracks absorb whatever
          space remains, keeping the Shop navigation visually centered
          without a hardcoded width. min-w-0 on both side zones lets them
          shrink under pressure instead of forcing the row wider than the
          viewport.
        */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-4">
          {/* LEFT: Logo + Admin shortcut */}
          <div className="flex min-w-0 items-center justify-self-start gap-3">
            <Link href="/" aria-label={`${brand.name} — Home`} className="relative h-11 w-36 shrink-0">
              <Image src={brand.logoUrl} alt={brand.name} fill priority sizes="144px" className="object-contain object-left" />
            </Link>

            {adminHref && (
              <Link
                href={adminHref}
                aria-label="Admin"
                title="Admin"
                className="flex shrink-0 items-center gap-1.5 border border-ink-200 px-2 py-1 text-xs font-medium text-ink-600 transition-colors hover:border-brass hover:text-brass-600"
              >
                <LayoutDashboard size={14} aria-hidden />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* CENTER: primary Shop navigation — untouched, just re-homed */}
          <DesktopNav items={mainNav} />

          {/* RIGHT: customer actions */}
          <div className="flex min-w-0 items-center justify-self-end gap-4">
            <SearchBar />
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`}
              className="relative text-ink-700 transition-colors hover:text-brass-600"
            >
              <Heart size={19} />
              {wishlistCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-[10px] font-medium text-bone"
                >
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>
            <Link
              href="/cart"
              aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
              className="relative shrink-0 text-ink-700 transition-colors hover:text-brass-600"
            >
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-[10px] font-medium text-bone"
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <UserMenu session={session} />
          </div>
        </div>
      </div>
    </header>
  );
}
