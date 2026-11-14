import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getHomepageSettings } from "@/lib/settings/homepage";
import HomepageContentForm from "@/components/admin/content/HomepageContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminHomepageContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getHomepageSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Homepage" }]} />
      <h1 className="mb-2 font-display text-2xl text-ink">Homepage</h1>
      <p className="mb-6 text-sm text-ink-500">Enable/disable, reorder, and edit the content of each existing homepage section.</p>
      <HomepageContentForm initial={settings} />
    </div>
  );
}
