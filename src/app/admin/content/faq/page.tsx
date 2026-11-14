import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getFaqSettings } from "@/lib/settings/faq";
import FaqContentForm from "@/components/admin/content/FaqContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminFaqContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getFaqSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "FAQ" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">FAQ</h1>
      <FaqContentForm initial={settings} />
    </div>
  );
}
