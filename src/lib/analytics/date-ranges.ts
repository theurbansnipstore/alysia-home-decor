// Deliberately no "server-only" here — pure date math with no DB/secret
// access, and DateRangeSelector.tsx (a client component) imports
// RANGE_PRESET_OPTIONS/RangePreset from this file.

export type RangePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "thisYear" | "custom";

export type Granularity = "hour" | "day" | "week" | "month";

export interface ResolvedRange {
  preset: RangePreset;
  /** Inclusive lower bound. */
  start: Date;
  /** Exclusive upper bound. */
  end: Date;
  /** Equal-length window immediately preceding `start` — always available since it only needs Order.createdAt, which every order has. */
  previousStart: Date;
  previousEnd: Date;
  granularity: Granularity;
  label: string;
}

export const RANGE_PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Resolves a preset (or custom from/to, as "YYYY-MM-DD" strings) into a
 * concrete [start, end) window plus an equal-length trailing comparison
 * window. Server-local time throughout — this project has no timezone
 * config anywhere else (order timestamps elsewhere just use
 * `new Date(x).toLocaleString()`), so analytics deliberately doesn't
 * invent one either.
 */
export function resolveDateRange(preset: RangePreset, customFrom?: string, customTo?: string): ResolvedRange {
  const now = new Date();
  const todayStart = startOfDay(now);

  let start: Date;
  let end: Date;
  let label: string;

  switch (preset) {
    case "today":
      start = todayStart;
      end = addDays(todayStart, 1);
      label = "Today";
      break;
    case "yesterday":
      start = addDays(todayStart, -1);
      end = todayStart;
      label = "Yesterday";
      break;
    case "last7":
      start = addDays(todayStart, -6);
      end = addDays(todayStart, 1);
      label = "Last 7 Days";
      break;
    case "last30":
      start = addDays(todayStart, -29);
      end = addDays(todayStart, 1);
      label = "Last 30 Days";
      break;
    case "thisMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = addDays(todayStart, 1);
      label = "This Month";
      break;
    case "lastMonth": {
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = firstOfThisMonth;
      label = "Last Month";
      break;
    }
    case "thisYear":
      start = new Date(now.getFullYear(), 0, 1);
      end = addDays(todayStart, 1);
      label = "This Year";
      break;
    case "custom":
    default: {
      const from = customFrom ? new Date(customFrom + "T00:00:00") : addDays(todayStart, -6);
      const to = customTo ? new Date(customTo + "T00:00:00") : todayStart;
      start = startOfDay(from);
      end = addDays(startOfDay(to), 1);
      if (end <= start) end = addDays(start, 1);
      label = "Custom Range";
      break;
    }
  }

  const spanMs = end.getTime() - start.getTime();
  const previousEnd = start;
  const previousStart = new Date(start.getTime() - spanMs);

  const spanDays = spanMs / 86_400_000;
  let granularity: Granularity;
  if (preset === "today" || preset === "yesterday" || spanDays <= 2) granularity = "hour";
  else if (spanDays <= 60) granularity = "day";
  else if (spanDays <= 370) granularity = "week";
  else granularity = "month";

  return { preset, start, end, previousStart, previousEnd, granularity, label };
}

/** Bucket key for grouping a timestamp — sortable string, stable across a query result set. */
export function bucketKey(date: Date, granularity: Granularity): string {
  const d = new Date(date);
  if (granularity === "hour") {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}`;
  }
  if (granularity === "day") {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (granularity === "week") {
    // ISO-ish: key by the Monday of that week.
    const monday = new Date(d);
    const dow = (monday.getDay() + 6) % 7; // 0 = Monday
    monday.setDate(monday.getDate() - dow);
    monday.setHours(0, 0, 0, 0);
    return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "hour") {
    const [datePart, hourPart] = key.split("T");
    const d = new Date(`${datePart}T${hourPart}:00:00`);
    return d.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
  }
  if (granularity === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }
  // day + week both keyed by a calendar date
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Every bucket key the range spans, in order — so the chart shows zero-value buckets instead of skipping gaps. */
export function enumerateBuckets(start: Date, end: Date, granularity: Granularity): string[] {
  const keys: string[] = [];
  const cursor = new Date(start);
  const seen = new Set<string>();
  while (cursor < end) {
    const key = bucketKey(cursor, granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    if (granularity === "hour") cursor.setHours(cursor.getHours() + 1);
    else if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
    else if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // null = "no baseline to compare against", not 0%
  return ((current - previous) / previous) * 100;
}
