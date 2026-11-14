import { notFound, permanentRedirect } from "next/navigation";
import { getProductBySlug, getProductRedirectSlug } from "@/lib/data/products";

interface Props {
  children: React.ReactNode;
  params: { slug: string };
}

/**
 * Module 33 fix. This segment has a loading.tsx, which makes Next.js wrap
 * page.tsx in a Suspense boundary and start streaming its 200 shell
 * immediately — so a notFound()/permanentRedirect() thrown from INSIDE
 * page.tsx (after that streaming has already begun) can no longer change
 * the response's HTTP status: it silently degrades to a client-side
 * meta-refresh / soft-404 that a browser follows but that crawlers and
 * plain HTTP clients (curl, Googlebot, this project's own simulate-seo.ts)
 * don't reliably treat as a real 308/404. Confirmed empirically: moving the
 * same check into generateMetadata() did NOT fix it either (Next 14.2.5
 * still streams before generateMetadata's redirect can take effect once a
 * loading.tsx exists on the segment).
 *
 * A segment layout.tsx, by contrast, renders as part of the page's shell
 * BEFORE `{children}` — i.e. before the loading.tsx Suspense boundary is
 * even constructed — so a redirect()/notFound() thrown here aborts the
 * response before anything has been flushed, producing a genuine HTTP
 * status. page.tsx keeps its own not-found/redirect handling too, as a
 * defense-in-depth fallback (this project's established pattern), but this
 * layout is what makes the status code itself correct.
 */
export default async function ProductSlugLayout({ children, params }: Props) {
  const result = await getProductBySlug(params.slug);
  if (!result) {
    const currentSlug = await getProductRedirectSlug(params.slug);
    if (currentSlug) permanentRedirect(`/product/${currentSlug}`);
    notFound();
  }
  return children;
}
