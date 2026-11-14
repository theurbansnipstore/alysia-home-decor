import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getContactSettings } from "@/lib/settings/contact";
import ContactContentForm from "@/components/admin/content/ContactContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminContactContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getContactSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Contact Page" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Contact Page</h1>
      <ContactContentForm initial={settings} />
    </div>
  );
}
