"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { toggleSearchParam } from "@/lib/utils";
import {
  BADGE_FILTERS,
  BADGE_ORDER,
  PRICE_BUCKETS,
  FILTER_SECTION_ORDER,
  type FilterSectionKey,
} from "@/lib/config/catalog";

interface FilterOption {
  name: string;
  slug: string;
}

interface FilterSidebarProps {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  categories?: FilterOption[];
  themes?: FilterOption[];
  hiddenSections?: FilterSectionKey[];
}

function toURLSearchParams(params: Record<string, string | string[] | undefined>): URLSearchParams {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => usp.append(key, v));
    else if (value !== undefined) usp.set(key, value);
  }
  return usp;
}

export default function FilterSidebar({
  basePath,
  searchParams,
  categories = [],
  themes = [],
  hiddenSections = [],
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const current = toURLSearchParams(searchParams);

  const selectedBadges = current.getAll("badge");
  const selectedPrice = current.get("price");
  const inStockOnly = current.get("inStock") === "1";
  const selectedCategory = current.get("category");
  const selectedTheme = current.get("theme");

  function hrefFor(key: string, value: string, multi = false) {
    const next = toggleSearchParam(current, key, value, multi);
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const sections = FILTER_SECTION_ORDER.filter((s) => !hiddenSections.includes(s));

  const content = (
    <div className="space-y-8">
      {sections.map((section) => {
        if (section === "category" && categories.length > 0) {
          return (
            <fieldset key="category">
              <legend className="mb-3 font-mono text-xs uppercase tracking-widest text-brass-600">Category</legend>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <FilterCheckLink
                    key={cat.slug}
                    label={cat.name}
                    href={hrefFor("category", cat.slug)}
                    checked={selectedCategory === cat.slug}
                  />
                ))}
              </div>
            </fieldset>
          );
        }

        if (section === "theme" && themes.length > 0) {
          return (
            <fieldset key="theme">
              <legend className="mb-3 font-mono text-xs uppercase tracking-widest text-brass-600">Theme</legend>
              <div className="space-y-2">
                {themes.map((theme) => (
                  <FilterCheckLink
                    key={theme.slug}
                    label={theme.name}
                    href={hrefFor("theme", theme.slug)}
                    checked={selectedTheme === theme.slug}
                  />
                ))}
              </div>
            </fieldset>
          );
        }

        if (section === "badges") {
          return (
            <fieldset key="badges">
              <legend className="mb-3 font-mono text-xs uppercase tracking-widest text-brass-600">Highlights</legend>
              <div className="space-y-2">
                {BADGE_ORDER.map((key) => (
                  <FilterCheckLink
                    key={key}
                    label={BADGE_FILTERS[key].filterLabel}
                    href={hrefFor("badge", key, true)}
                    checked={selectedBadges.includes(key)}
                  />
                ))}
              </div>
            </fieldset>
          );
        }

        if (section === "price") {
          return (
            <fieldset key="price">
              <legend className="mb-3 font-mono text-xs uppercase tracking-widest text-brass-600">Price</legend>
              <div className="space-y-2">
                {PRICE_BUCKETS.map((bucket, i) => (
                  <FilterCheckLink
                    key={bucket.label}
                    label={bucket.label}
                    href={hrefFor("price", String(i))}
                    checked={selectedPrice === String(i)}
                  />
                ))}
              </div>
            </fieldset>
          );
        }

        if (section === "availability") {
          return (
            <fieldset key="availability">
              <legend className="mb-3 font-mono text-xs uppercase tracking-widest text-brass-600">
                Availability
              </legend>
              <div className="space-y-2">
                <FilterCheckLink label="In Stock Only" href={hrefFor("inStock", "1")} checked={inStockOnly} />
              </div>
            </fieldset>
          );
        }

        return null;
      })}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open filters"
        className="mb-6 flex items-center gap-2 border border-ink-100 px-4 py-2 text-sm text-ink-700 transition-colors hover:border-brass lg:hidden"
      >
        <SlidersHorizontal size={16} /> Filters
      </button>

      <aside className="hidden w-64 shrink-0 lg:block">{content}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] overflow-y-auto bg-bone-100 p-6 shadow-card">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg text-ink">Filters</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters">
                <X size={20} />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

function FilterCheckLink({ label, href, checked }: { label: string; href: string; checked: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-sm text-ink-700 transition-colors hover:text-brass-600">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
          checked ? "border-ink bg-ink text-bone-100" : "border-ink-100"
        }`}
        aria-hidden
      >
        {checked && <Check size={11} />}
      </span>
      <span className={checked ? "text-ink" : ""}>{label}</span>
    </Link>
  );
}
