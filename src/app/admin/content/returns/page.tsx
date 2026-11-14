import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getReturnsSettings } from "@/lib/settings/returns";
import PolicyContentForm from "@/components/admin/content/PolicyContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminReturnsContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getReturnsSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Returns Policy" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Returns Policy</h1>
      <PolicyContentForm initial={settings} apiPath="/api/admin/content/returns" />
    </div>
  );
}
