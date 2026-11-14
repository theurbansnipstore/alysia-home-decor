import { requireRole } from "@/lib/session";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { getAllCategoriesAdmin } from "@/lib/data/categories";
import { getAllThemesAdmin } from "@/lib/data/themes";
import ProductForm from "@/components/admin/products/ProductForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function NewProductPage() {
  await requireRole(FULL_PRODUCT_ADMIN_ROLES);

  const [categories, themes] = await Promise.all([getAllCategoriesAdmin(), getAllThemesAdmin()]);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: "Add Product" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">New Product</h1>
      <ProductForm mode="create" categories={categories} themes={themes} />
    </div>
  );
}
