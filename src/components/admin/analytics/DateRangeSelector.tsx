"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RANGE_PRESET_OPTIONS, type RangePreset } from "@/lib/analytics/date-ranges";

interface Props {
  current: RangePreset;
  from?: string;
  to?: string;
}

/** Same URL-driven navigation pattern as SortDropdown.tsx — no client data-fetching, the server page re-renders on navigation. */
export default function DateRangeSelector({ current, from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");
  const [showCustom, setShowCustom] = useState(current === "custom");

  function applyPreset(preset: RangePreset) {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    router.push(`${pathname}?preset=${preset}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    router.push(`${pathname}?preset=custom&from=${customFrom}&to=${customTo}`);
  }

  return (
    <div className="mb-6 border border-ink-100 bg-bone p-3 sm:p-4">
      <div className="flex flex-wrap gap-2">
        {RANGE_PRESET_OPTIONS.map((opt) => {
          const isActive = opt.value === current || (opt.value === "custom" && showCustom);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => applyPreset(opt.value)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs transition-colors sm:text-sm ${
                isActive ? "border border-brass bg-brass/10 text-brass-700" : "border border-ink-100 text-ink-600 hover:border-brass"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-ink-500">From</label>
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">To</label>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="border border-ink bg-ink px-4 py-2 text-sm text-bone-100 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
