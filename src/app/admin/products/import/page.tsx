import { requireRole } from "@/lib/session";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import ImportWizard from "@/components/admin/products/ImportWizard";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function ImportProductsPage() {
  await requireRole(FULL_PRODUCT_ADMIN_ROLES);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: "Import" }]} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-2 font-display text-2xl text-ink">Import Products</h1>
          <p className="max-w-2xl text-sm text-ink-500">
            Upload a .csv or .xlsx file matching the exported template. SKU is the matching key — a row with an
            existing SKU updates that product, a new SKU creates one. Nothing is written to the database until you
            review the preview and confirm.
          </p>
        </div>
        <a
          href="/api/admin/products/import/template"
          className="whitespace-nowrap border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
        >
          Download Template
        </a>
      </div>
      <ImportWizard />
    </div>
  );
}
