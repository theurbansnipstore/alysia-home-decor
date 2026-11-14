import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export default function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-label="Previous page"
        aria-disabled={page === 1}
        className={`flex h-9 w-9 items-center justify-center border border-ink-100 transition-colors ${
          page === 1 ? "pointer-events-none text-ink-300" : "text-ink-700 hover:border-brass hover:text-brass-600"
        }`}
      >
        <ChevronLeft size={16} />
      </Link>

      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={`flex h-9 w-9 items-center justify-center border text-sm transition-colors ${
            p === page
              ? "border-ink bg-ink text-bone-100"
              : "border-ink-100 text-ink-700 hover:border-brass hover:text-brass-600"
          }`}
        >
          {p}
        </Link>
      ))}

      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-label="Next page"
        aria-disabled={page === totalPages}
        className={`flex h-9 w-9 items-center justify-center border border-ink-100 transition-colors ${
          page === totalPages
            ? "pointer-events-none text-ink-300"
            : "text-ink-700 hover:border-brass hover:text-brass-600"
        }`}
      >
        <ChevronRight size={16} />
      </Link>
    </nav>
  );
}
