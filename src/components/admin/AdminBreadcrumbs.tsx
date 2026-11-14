import Link from "next/link";

export interface AdminBreadcrumbItem {
  label: string;
  /** Omitted on the current (last) item — it renders as plain text, never a link. */
  href?: string;
}

/**
 * Deliberately never includes a universal "Admin" root crumb pointing at
 * /admin (Dashboard Overview) — that page is SUPER_ADMIN/ADMIN-only
 * (DASHBOARD_OVERVIEW_ROLES), so a hardcoded root link would 404/redirect
 * for every other staff role reaching a nested page (e.g. ORDER_MANAGER on
 * an order detail page). Callers pass only the segments that are always
 * safe for whoever can already reach this page — the section hub
 * (Products/Orders/Settings/Content/...), which every nested page's own
 * role gate is already a subset of.
 */
export default function AdminBreadcrumbs({ items }: { items: AdminBreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-ink-300" aria-hidden="true">
                  ›
                </span>
              )}
              {isLast || !item.href ? (
                <span aria-current={isLast ? "page" : undefined} className="font-medium text-ink-700">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-ink-500 transition-colors hover:text-brass-600 hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
