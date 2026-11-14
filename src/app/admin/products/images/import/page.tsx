import { requireRole } from "@/lib/session";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import ProductImageImportWizard from "@/components/admin/products/ProductImageImportWizard";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function ProductImageImportPage() {
  await requireRole(FULL_PRODUCT_ADMIN_ROLES);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: "Image Import" }]} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-2 font-display text-2xl text-ink">Import Product Images (by URL)</h1>
          <p className="max-w-2xl text-sm text-ink-500">
            Upload a .csv or .xlsx file matching the exported template. Rows reference image URLs, not binary files —
            for uploading image FILES in bulk, use{" "}
            <a href="/admin/products/images/bulk" className="text-brass-600 hover:underline">
              Bulk Images
            </a>{" "}
            instead. Nothing is written to the database until you review the preview and confirm.
          </p>
        </div>
        <a
          href="/api/admin/products/images/import/template"
          className="whitespace-nowrap border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
        >
          Download Template
        </a>
      </div>
      <ProductImageImportWizard />
    </div>
  );
}
