import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getCareersSettings } from "@/lib/settings/careers";
import CareersContentForm from "@/components/admin/content/CareersContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminCareersContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getCareersSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Careers" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Careers</h1>
      <CareersContentForm initial={settings} />
    </div>
  );
}
