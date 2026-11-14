import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getSocialSettings } from "@/lib/settings/social";
import SocialContentForm from "@/components/admin/content/SocialContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminSocialContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getSocialSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Social Media" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Social Media</h1>
      <SocialContentForm initial={settings} />
    </div>
  );
}
