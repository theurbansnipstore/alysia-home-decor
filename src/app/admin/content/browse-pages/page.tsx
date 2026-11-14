import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getBrowsePagesSettings } from "@/lib/settings/browse-pages";
import BrowsePagesContentForm from "@/components/admin/content/BrowsePagesContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminBrowsePagesContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const settings = await getBrowsePagesSettings();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Categories / Themes / Collections" }]} />
      <h1 className="mb-2 font-display text-2xl text-ink">Categories / Themes / Collections Pages</h1>
      <p className="mb-6 text-sm text-ink-500">
        Editorial page chrome only — the actual categories/themes shown always come from your real catalog and are managed under Products.
      </p>
      <BrowsePagesContentForm initial={settings} />
    </div>
  );
}
