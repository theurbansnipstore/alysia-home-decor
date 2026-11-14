"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SORT_OPTIONS } from "@/lib/config/catalog";

export default function SortDropdown({ currentSort }: { currentSort: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-ink-700">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={currentSort}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
