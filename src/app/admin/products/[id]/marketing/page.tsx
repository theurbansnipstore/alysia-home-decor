import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { prisma } from "@/lib/prisma";
import MarketingPanel from "@/components/admin/products/MarketingPanel";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

/**
 * Narrow dedicated screen for MARKETING_STAFF (also reachable by full-access
 * roles) — only the 4 marketing flags + SEO title/description.
 */
export default async function ProductMarketingPage({ params }: { params: { id: string } }) {
  await requireRole(MARKETING_ADMIN_ROLES);

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      description: true,
      slug: true,
      status: true,
      isFeatured: true,
      isBestSeller: true,
      isTrending: true,
      isNewArrival: true,
      seoTitle: true,
      seoDesc: true,
    },
  });
  if (!product) notFound();

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[{ label: "Products", href: "/admin/products" }, { label: `Marketing — ${product.name}` }]}
      />
      <MarketingPanel
        productId={product.id}
        productName={product.name}
        productDescription={product.description}
        productSlug={product.slug}
        productStatus={product.status}
        initial={{
          isFeatured: product.isFeatured,
          isBestSeller: product.isBestSeller,
          isTrending: product.isTrending,
          isNewArrival: product.isNewArrival,
          seoTitle: product.seoTitle,
          seoDesc: product.seoDesc,
        }}
      />
    </div>
  );
}
