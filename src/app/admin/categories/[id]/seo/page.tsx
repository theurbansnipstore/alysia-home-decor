import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { getCategoryByIdAdmin } from "@/lib/data/categories";
import CategorySeoPanel from "@/components/admin/categories/CategorySeoPanel";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function CategorySeoPage({ params }: { params: { id: string } }) {
  await requireRole(MARKETING_ADMIN_ROLES);
  const category = await getCategoryByIdAdmin(params.id);
  if (!category) notFound();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Category SEO", href: "/admin/categories" }, { label: category.name }]} />
      <CategorySeoPanel
        categoryId={category.id}
        categoryName={category.name}
        categoryDescription={category.description ?? null}
        categorySlug={category.slug}
        categoryIsVisible={category.isVisible ?? true}
        initial={{ seoTitle: category.seoTitle ?? null, seoDesc: category.seoDesc ?? null }}
      />
    </div>
  );
}
