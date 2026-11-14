import { percentChange } from "@/lib/analytics/date-ranges";

interface Props {
  label: string;
  value: string | number;
  previous?: number;
  currentRaw?: number;
  warn?: boolean;
  hint?: string;
}

/** KPI card with an optional vs-previous-period trend indicator. Omits the trend entirely (rather than showing a fake 0%) when there's no previous-period baseline to compare against. */
export default function KpiCard({ label, value, previous, currentRaw, warn, hint }: Props) {
  const showTrend = previous !== undefined && currentRaw !== undefined;
  const change = showTrend ? percentChange(currentRaw!, previous!) : null;

  return (
    <div className="border border-ink-100 bg-bone p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl ${warn ? "text-clay" : "text-ink"}`}>{value}</p>
      {showTrend && (
        <p className={`mt-1 text-xs ${change === null ? "text-ink-300" : change > 0 ? "text-sage-600" : change < 0 ? "text-clay" : "text-ink-400"}`}>
          {change === null ? "No prior-period data" : `${change > 0 ? "↑" : change < 0 ? "↓" : "→"} ${Math.abs(change).toFixed(1)}% vs previous period`}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-ink-300">{hint}</p>}
    </div>
  );
}
