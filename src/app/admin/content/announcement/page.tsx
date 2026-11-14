import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getAnnouncementSettings } from "@/lib/settings/announcement";
import AnnouncementContentForm from "@/components/admin/content/AnnouncementContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminAnnouncementContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getAnnouncementSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Announcement Bar" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Announcement Bar</h1>
      <AnnouncementContentForm initial={settings} />
    </div>
  );
}
