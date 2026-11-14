import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getNavigationSettings } from "@/lib/settings/navigation";
import { getAllCategoriesAdmin } from "@/lib/data/categories";
import { getAllThemesAdmin } from "@/lib/data/themes";
import NavigationContentForm from "@/components/admin/content/NavigationContentForm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminNavigationContentPage() {
  await requireRole(CONTENT_AREA_ROLES);
  const [settings, categories, themes] = await Promise.all([
    getNavigationSettings(),
    getAllCategoriesAdmin(),
    getAllThemesAdmin(),
  ]);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Header Navigation" }]} />
      <h1 className="mb-2 font-display text-2xl text-ink">Header Navigation</h1>
      <p className="mb-6 text-sm text-ink-500">
        The Shop menu&apos;s Categories/Themes columns default to your live catalog (in real catalog order) — switch
        either to &quot;Custom&quot; below to hand-pick which categories or themes appear and in what order. A
        hidden or deleted category/theme is automatically dropped, never left as a broken link.
      </p>
      <NavigationContentForm initial={settings} categories={categories} themes={themes} />
    </div>
  );
}
