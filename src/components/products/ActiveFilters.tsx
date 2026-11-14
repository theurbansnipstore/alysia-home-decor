import Link from "next/link";
import { X } from "lucide-react";
import { toggleSearchParam } from "@/lib/utils";
import { BADGE_FILTERS, PRICE_BUCKETS, type BadgeKey } from "@/lib/config/catalog";

export interface ActiveFilterChip {
  label: string;
  href: string;
}

interface BuildChipsOptions {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  /** Resolved display name for a locked/selected category, if any. */
  categoryName?: string;
  /** Resolved display name for a locked/selected theme, if any. */
  themeName?: string;
  /** Set true on /categories/[slug] or /themes/[slug] — that filter is locked, not removable/chip-worthy. */
  lockCategory?: boolean;
  lockTheme?: boolean;
}

function toURLSearchParams(params: Record<string, string | string[] | undefined>): URLSearchParams {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => usp.append(key, v));
    else if (value !== undefined) usp.set(key, value);
  }
  return usp;
}

/** Single place all three catalog pages derive their "active filter" chips from — not three separate implementations. */
export function buildActiveFilterChips(options: BuildChipsOptions): ActiveFilterChip[] {
  const { basePath, searchParams, categoryName, themeName, lockCategory, lockTheme } = options;
  const current = toURLSearchParams(searchParams);
  const chips: ActiveFilterChip[] = [];

  function removeHref(key: string, value: string, multi = false) {
    const next = toggleSearchParam(current, key, value, multi);
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  if (!lockCategory && categoryName && current.get("category")) {
    chips.push({ label: `Category: ${categoryName}`, href: removeHref("category", current.get("category")!) });
  }
  if (!lockTheme && themeName && current.get("theme")) {
    chips.push({ label: `Theme: ${themeName}`, href: removeHref("theme", current.get("theme")!) });
  }
  for (const badge of current.getAll("badge")) {
    const def = BADGE_FILTERS[badge as BadgeKey];
    if (def) chips.push({ label: def.filterLabel, href: removeHref("badge", badge, true) });
  }
  const priceIndex = current.get("price");
  if (priceIndex && PRICE_BUCKETS[Number(priceIndex)]) {
    chips.push({ label: PRICE_BUCKETS[Number(priceIndex)].label, href: removeHref("price", priceIndex) });
  }
  if (current.get("inStock") === "1") {
    chips.push({ label: "In Stock Only", href: removeHref("inStock", "1") });
  }
  if (current.get("q")) {
    chips.push({ label: `Search: "${current.get("q")}"`, href: removeHref("q", current.get("q")!) });
  }

  return chips;
}

export default function ActiveFilters({ chips }: { chips: ActiveFilterChip[] }) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          className="flex items-center gap-1.5 border border-ink-100 px-3 py-1.5 text-xs text-ink-700 transition-colors hover:border-brass hover:text-brass-600"
        >
          {chip.label}
          <X size={12} aria-label={`Remove filter: ${chip.label}`} />
        </Link>
      ))}
    </div>
  );
}
