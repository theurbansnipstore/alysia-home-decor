"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItemSetting } from "@/lib/settings/faq";

export default function FaqAccordion({ items }: { items: FaqItemSetting[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-ink-100 border-y border-ink-100">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between py-4 text-left text-sm text-ink-700"
            >
              {item.question}
              <ChevronDown size={16} aria-hidden className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <p className="pb-4 text-sm leading-relaxed text-ink-500">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
