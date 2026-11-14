import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { getBrandSettings } from "@/lib/config/brand";

/**
 * Custom 404 (Module 33). Next.js already returns a real HTTP 404 status
 * for any unmatched route or explicit notFound() call regardless of this
 * file — that status code alone keeps the URL out of search results, this
 * page is purely presentational (on-brand, with a real path back into the
 * site) plus an explicit noindex for defense in depth, matching every
 * other non-indexable page in the app.
 */
export const metadata: Metadata = {
  title: `Page Not Found — ${getBrandSettings().name}`,
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-16 sm:px-6">
      <EmptyState
        icon={Compass}
        title="We couldn't find that page"
        description="The page you're looking for may have moved or no longer exists. Try the shop, or head back home."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <Button type="button" variant="primary">
                Back to Home
              </Button>
            </Link>
            <Link href="/shop">
              <Button type="button" variant="secondary">
                Browse Shop
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
