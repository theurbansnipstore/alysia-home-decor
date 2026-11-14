import { requireRole } from "@/lib/session";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { getShopSettings } from "@/lib/settings/shop";
import ShopSettingsForm from "@/components/admin/settings/ShopSettingsForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminShopSettingsPage() {
  await requireRole(SETTINGS_AREA_ROLES);
  const settings = await getShopSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Settings", href: "/admin/settings" }, { label: "Shop & Product Cards" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Shop &amp; Product Cards</h1>
      <ShopSettingsForm initial={settings} />
    </div>
  );
}
