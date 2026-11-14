import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import PageForm from "@/components/admin/content/PageForm";

export default async function AdminNewPagePage() {
  await requireRole(CONTENT_AREA_ROLES);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Pages", href: "/admin/content/pages" }, { label: "New Page" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">New Page</h1>
      <PageForm mode="create" initial={{ title: "", slug: "", content: "", excerpt: "", seoTitle: "", seoDesc: "" }} initialStatus="DRAFT" />
    </div>
  );
}
