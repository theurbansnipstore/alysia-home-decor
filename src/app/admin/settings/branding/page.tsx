import { requireRole } from "@/lib/session";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { getBrandingSettings } from "@/lib/settings/branding";
import BrandingForm from "@/components/admin/settings/BrandingForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminBrandingSettingsPage() {
  await requireRole(SETTINGS_AREA_ROLES);
  const branding = await getBrandingSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Settings", href: "/admin/settings" }, { label: "Branding" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Branding</h1>
      <BrandingForm initial={branding} />
    </div>
  );
}
