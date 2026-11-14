import Link from "next/link";
import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { prisma } from "@/lib/prisma";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function AdminPagesListPage() {
  await requireRole(CONTENT_AREA_ROLES);

  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, updatedAt: true },
  });

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Pages" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Pages</h1>
        <Link href="/admin/content/pages/new" className="border border-ink bg-ink px-5 py-2 text-sm text-bone-100 hover:bg-ink-700">
          New Page
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="border border-ink-100 bg-bone p-8 text-center text-sm text-ink-500">
          No pages yet. Create one for editorial content that doesn&apos;t have its own dedicated page — a lookbook, a press page, a one-off announcement.
        </p>
      ) : (
        <div className="overflow-x-auto border border-ink-100 bg-bone">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-b border-ink-100 last:border-0 hover:bg-bone-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/content/pages/${p.id}`} className="font-medium text-ink hover:text-brass-600 hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-500">/{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className={p.status === "PUBLISHED" ? "text-sage-600" : "text-ink-500"}>{p.status === "PUBLISHED" ? "Published" : "Draft"}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{p.updatedAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
