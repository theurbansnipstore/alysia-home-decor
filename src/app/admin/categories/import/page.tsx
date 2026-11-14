import { requireRole } from "@/lib/session";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import CategorySeoImportWizard from "@/components/admin/categories/CategorySeoImportWizard";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function CategorySeoImportPage() {
  await requireRole(MARKETING_ADMIN_ROLES);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Category SEO", href: "/admin/categories" }, { label: "Import" }]} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-2 font-display text-2xl text-ink">Import Category SEO</h1>
          <p className="max-w-2xl text-sm text-ink-500">
            Upload a .csv or .xlsx file matching the exported template. Slug is the matching key. Only SEO Title and
            SEO Description can be changed this way — name, image, and visibility are managed elsewhere. Nothing is
            written to the database until you review the preview and confirm.
          </p>
        </div>
        <a
          href="/api/admin/categories/import/template"
          className="whitespace-nowrap border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
        >
          Download Template
        </a>
      </div>
      <CategorySeoImportWizard />
    </div>
  );
}
