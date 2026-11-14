import { formatPrice } from "@/lib/utils";
import type { RevenuePoint } from "@/lib/data/admin-analytics";

/**
 * Plain flexbox/CSS bars, not a charting library — this project has none
 * installed (no recharts/chart.js in package.json) and pulling one in for a
 * handful of bars would be disproportionate. Scrolls horizontally inside
 * its own container on narrow screens instead of ever widening the page.
 */
export default function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const hasData = points.some((p) => p.revenue > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center border border-ink-100 bg-bone text-sm text-ink-400">
        No revenue in this period.
      </div>
    );
  }

  return (
    <div className="border border-ink-100 bg-bone p-4">
      <div className="overflow-x-auto">
        <div className="flex h-56 min-w-full items-end gap-2" style={{ minWidth: `${points.length * 44}px` }}>
          {points.map((p) => (
            <div key={p.key} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <div className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-bone-100 group-hover:block">
                {formatPrice(p.revenue)} · {p.orders} order{p.orders === 1 ? "" : "s"}
              </div>
              <div
                className="w-full rounded-t bg-brass/70 transition-colors group-hover:bg-brass"
                style={{ height: `${Math.max(2, (p.revenue / max) * 100)}%` }}
              />
              <span className="mt-2 whitespace-nowrap text-[10px] text-ink-400">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
