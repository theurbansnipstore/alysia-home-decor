import Link from "next/link";
import { requireRole } from "@/lib/session";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { getAllCategoriesAdmin } from "@/lib/data/categories";

/**
 * Deliberately SEO-only (Module 31 Part 9) — this is not a category CRUD
 * screen. Category name/slug/parent/sortOrder/visibility/image have no
 * admin UI anywhere in this codebase today (seed-managed); building that
 * is a separate feature, out of this SEO module's scope. This list exists
 * only to route into each category's narrow SEO edit screen, the same
 * "narrow dedicated screen" pattern Module 10 already established for
 * product stock/marketing.
 */
export default async function AdminCategoriesPage() {
  await requireRole(MARKETING_ADMIN_ROLES);
  const categories = await getAllCategoriesAdmin();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl text-ink">Category SEO</h1>
          <p className="text-sm text-ink-500">
            Search-engine title and description per category. Category name, slug, and visibility are managed elsewhere in this project.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/admin/categories/export?format=xlsx" className="whitespace-nowrap border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
            Export
          </a>
          <Link href="/admin/categories/import" className="whitespace-nowrap border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
            Bulk Import SEO
          </Link>
        </div>
      </div>

      <div className="divide-y divide-ink-100 border border-ink-100 bg-bone">
        {categories.map((c) => (
          <Link key={c.id} href={`/admin/categories/${c.id}/seo`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-bone-100">
            <div>
              <p className="text-ink">{c.name}</p>
              <p className="font-mono text-xs text-ink-400">/categories/{c.slug}</p>
            </div>
            <span className="text-xs text-ink-400">{c.seoTitle || c.seoDesc ? "Custom SEO set" : "Using auto-generated SEO"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
