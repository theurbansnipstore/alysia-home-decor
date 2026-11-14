import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getShippingSettings } from "@/lib/settings/shipping";
import PolicyContentForm from "@/components/admin/content/PolicyContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminShippingContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getShippingSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Shipping Policy" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Shipping Policy</h1>
      <PolicyContentForm
        initial={settings}
        apiPath="/api/admin/content/shipping"
        freeShipping={{ enabled: settings.freeShippingEnabled, threshold: settings.freeShippingThreshold }}
      />
    </div>
  );
}
