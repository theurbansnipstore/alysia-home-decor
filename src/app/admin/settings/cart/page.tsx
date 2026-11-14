import { requireRole } from "@/lib/session";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { getCartSettings } from "@/lib/settings/cart";
import CartSettingsForm from "@/components/admin/settings/CartSettingsForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminCartSettingsPage() {
  await requireRole(SETTINGS_AREA_ROLES);
  const settings = await getCartSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Settings", href: "/admin/settings" }, { label: "Cart" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Cart</h1>
      <CartSettingsForm initial={settings} />
    </div>
  );
}
