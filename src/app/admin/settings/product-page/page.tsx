import { requireRole } from "@/lib/session";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { getProductPageSettings } from "@/lib/settings/product-page";
import ProductPageForm from "@/components/admin/settings/ProductPageForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminProductPageSettingsPage() {
  await requireRole(SETTINGS_AREA_ROLES);
  const settings = await getProductPageSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Settings", href: "/admin/settings" }, { label: "Product Page" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Product Page</h1>
      <ProductPageForm initial={settings} />
    </div>
  );
}
