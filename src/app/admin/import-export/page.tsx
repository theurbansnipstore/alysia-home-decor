import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PRODUCT_AREA_ROLES, canManageProducts, canAdjustStock, canManageMarketing } from "@/lib/admin/roles";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

/**
 * Module 42 Part 1 — a single, non-technical-friendly hub for every bulk
 * Excel operation Module 41 built. This page does not implement any new
 * import/export LOGIC of its own — every button here is a plain link into
 * an existing, already-tested API route or an existing/new wizard page
 * (CategorySeoImportWizard, ProductImageImportWizard, and the pre-existing
 * ImportWizard/InventoryImportWizard). Gated at the broadest role that
 * legitimately needs any section here (PRODUCT_AREA_ROLES); each section's
 * own action links are additionally hidden per-role below, matching how
 * /admin/products already conditionally shows its Import link.
 */
export default async function ImportExportHubPage() {
  const session = await requireRole(PRODUCT_AREA_ROLES);
  const canProducts = canManageProducts(session.role);
  const canStock = canAdjustStock(session.role);
  const canMarketing = canManageMarketing(session.role);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Import / Export" }]} />
      <div className="mb-6">
        <h1 className="mb-2 font-display text-2xl text-ink">Import / Export</h1>
        <p className="max-w-2xl text-sm text-ink-500">
          Bulk catalog operations using Excel. <strong>Excel is a tool for editing many records at once — it is
          never the database.</strong> Every import here previews your changes first and only writes to the store
          after you confirm, going through the same checks as editing one record by hand.
        </p>
      </div>

      <div className="space-y-6">
        <Section title="Products" description="Bulk-create or update products.">
          <ActionLink href="/api/admin/products/export?scope=all&format=xlsx" label="Export Products (.xlsx)" />
          <ActionLink href="/api/admin/products/import/template" label="Download Template" />
          {canProducts && <ActionLink href="/admin/products/import" label="Upload &amp; Import" primary />}
        </Section>

        <Section title="Inventory" description="Stock adjustments — never a direct overwrite, always a tracked, reasoned change.">
          <ActionLink href="/api/admin/inventory/export?format=xlsx" label="Export Inventory (.xlsx)" />
          <ActionLink href="/api/admin/inventory/import/template" label="Download Template" />
          {canStock && <ActionLink href="/admin/inventory/import" label="Upload &amp; Import" primary />}
        </Section>

        <Section title="Product Images" description="Add or update product images by URL. For uploading image files directly, use Bulk Images instead.">
          <ActionLink href="/api/admin/products/images/export?format=xlsx" label="Export Product Images (.xlsx)" />
          <ActionLink href="/api/admin/products/images/import/template" label="Download Template" />
          {canProducts && <ActionLink href="/admin/products/images/import" label="Upload &amp; Import" primary />}
          {canProducts && <ActionLink href="/admin/products/images/bulk" label="Bulk Images (file upload)" />}
        </Section>

        <Section title="Category SEO" description="Search-engine title and description per category. Other category fields (name, image, visibility) are managed elsewhere.">
          <ActionLink href="/api/admin/categories/export?format=xlsx" label="Export Categories (.xlsx)" />
          <ActionLink href="/api/admin/categories/import/template" label="Download Template" />
          {canMarketing && <ActionLink href="/admin/categories/import" label="Upload &amp; Import" primary />}
        </Section>

        <Section title="Themes" description="Reference export only.">
          <ActionLink href="/api/admin/themes/export?format=xlsx" label="Export Themes (.xlsx)" />
          <p className="mt-3 max-w-xl text-xs text-ink-500">
            Theme editing/import is not available. There is no existing admin write API for Theme fields — Theme is
            currently managed only via the database/seed. This is disclosed here rather than a missing feature you
            need to look for.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="border border-ink-100 bg-bone p-5">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <p className="mb-4 mt-1 max-w-xl text-sm text-ink-500">{description}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ActionLink({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  const className = primary
    ? "border border-ink bg-ink px-4 py-2 text-sm text-bone-100 hover:bg-ink-700"
    : "border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass";
  return href.startsWith("/api/") ? (
    <a href={href} className={className}>
      {label}
    </a>
  ) : (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
