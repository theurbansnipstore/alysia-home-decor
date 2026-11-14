"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ProductPolicySetting } from "@/lib/settings/product-page";

export default function ProductPolicyAccordion({
  policies,
  returnPolicyOverride,
}: {
  policies: ProductPolicySetting[];
  returnPolicyOverride?: string | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const sections = policies
    .filter((section) => section.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => (section.id === "returns" && returnPolicyOverride ? { ...section, body: returnPolicyOverride } : section));

  if (sections.length === 0) return null;

  return (
    <div className="divide-y divide-ink-100 border-y border-ink-100">
      {sections.map((section, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={section.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between py-4 text-left text-sm text-ink-700"
            >
              {section.heading}
              <ChevronDown
                size={16}
                aria-hidden
                className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && <p className="pb-4 text-sm leading-relaxed text-ink-500">{section.body}</p>}
          </div>
        );
      })}
    </div>
  );
}
