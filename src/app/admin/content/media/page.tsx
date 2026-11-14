import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getMediaSettings } from "@/lib/settings/media";
import MediaContentForm from "@/components/admin/content/MediaContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminMediaContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getMediaSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Media" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Media</h1>
      <MediaContentForm initial={settings} />
    </div>
  );
}
