import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getFooterSettings } from "@/lib/settings/footer";
import FooterContentForm from "@/components/admin/content/FooterContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminFooterContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getFooterSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Footer" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Footer</h1>
      <FooterContentForm initial={settings} />
    </div>
  );
}
