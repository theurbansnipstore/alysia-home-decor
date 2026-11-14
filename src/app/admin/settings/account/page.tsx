import { requireRole } from "@/lib/session";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { getAccountSettings } from "@/lib/settings/account";
import AccountSettingsForm from "@/components/admin/settings/AccountSettingsForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminAccountSettingsPage() {
  await requireRole(SETTINGS_AREA_ROLES);
  const settings = await getAccountSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Settings", href: "/admin/settings" }, { label: "Customer Account" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Customer Account</h1>
      <AccountSettingsForm initial={settings} />
    </div>
  );
}
