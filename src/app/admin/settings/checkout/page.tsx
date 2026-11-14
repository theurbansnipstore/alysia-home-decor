import { requireRole } from "@/lib/session";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { getCheckoutSettings } from "@/lib/settings/checkout";
import CheckoutSettingsForm from "@/components/admin/settings/CheckoutSettingsForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminCheckoutSettingsPage() {
  await requireRole(SETTINGS_AREA_ROLES);
  const settings = await getCheckoutSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Settings", href: "/admin/settings" }, { label: "Checkout" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Checkout</h1>
      <CheckoutSettingsForm initial={settings} />
    </div>
  );
}
