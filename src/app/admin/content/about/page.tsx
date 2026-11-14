import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getAboutSettings } from "@/lib/settings/about";
import AboutContentForm from "@/components/admin/content/AboutContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminAboutContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getAboutSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "About Page" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">About Page</h1>
      <AboutContentForm initial={settings} />
    </div>
  );
}
