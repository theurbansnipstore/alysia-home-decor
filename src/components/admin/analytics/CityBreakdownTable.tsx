"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { CITY_TIER_LABELS } from "@/lib/analytics/city-tiers";
import type { CityBreakdownRow } from "@/lib/data/admin-city-analytics";

type SortKey = "orders" | "netSales" | "returnRate" | "cancellationRate" | "aov";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "orders", label: "Orders" },
  { value: "netSales", label: "Net Sales" },
  { value: "returnRate", label: "Return Rate" },
  { value: "cancellationRate", label: "Cancellation Rate" },
  { value: "aov", label: "AOV" },
];

function rate(value: number | null, numerator: number, denominator: number): string {
  if (value === null) return `— (${numerator}/${denominator})`;
  return `${value.toFixed(1)}% (${numerator}/${denominator})`;
}

/** Part 8: sortable city-level breakdown — client-side, since the full set is already fetched server-side and is small (one row per distinct city seen in the selected range). */
export default function CityBreakdownTable({ rows }: { rows: CityBreakdownRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("orders");

  const sorted = useMemo(() => {
    const withValue = rows.map((r) => {
      const value =
        sortKey === "orders"
          ? r.metrics.orders
          : sortKey === "netSales"
            ? r.metrics.netSales
            : sortKey === "returnRate"
              ? (r.metrics.returnRate ?? -1)
              : sortKey === "cancellationRate"
                ? r.metrics.cancellationRate
                : r.metrics.aov;
      return { row: r, value };
    });
    return withValue.sort((a, b) => b.value - a.value).map((w) => w.row);
  }, [rows, sortKey]);

  if (rows.length === 0) {
    return <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No orders with recorded shipping city in this period.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs text-ink-500">Sort by</label>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="border border-ink-100 bg-bone px-3 py-1.5 text-sm focus:border-brass focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border border-ink-100 bg-bone">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Net Sales</th>
              <th className="px-4 py-3">Delivered</th>
              <th className="px-4 py-3">Cancelled</th>
              <th className="px-4 py-3">Returned</th>
              <th className="px-4 py-3">Return Rate</th>
              <th className="px-4 py-3">Cancellation Rate</th>
              <th className="px-4 py-3">COD</th>
              <th className="px-4 py-3">Online</th>
              <th className="px-4 py-3">AOV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {sorted.map((r) => (
              <tr key={r.cityKey}>
                <td className="px-4 py-3 text-ink">{r.cityLabel}</td>
                <td className="px-4 py-3 text-ink-500">{CITY_TIER_LABELS[r.tier]}</td>
                <td className="px-4 py-3 text-ink-700">{r.metrics.orders}</td>
                <td className="px-4 py-3 text-ink-700">{formatPrice(r.metrics.netSales)}</td>
                <td className="px-4 py-3 text-ink-700">{r.metrics.deliveredOrders}</td>
                <td className="px-4 py-3 text-ink-700">{r.metrics.cancelledOrders}</td>
                <td className="px-4 py-3 text-ink-700">{r.metrics.returnedOrders}</td>
                <td className="px-4 py-3 text-ink-500">{rate(r.metrics.returnRate, r.metrics.returnedOrders, r.metrics.deliveredOrders)}</td>
                <td className="px-4 py-3 text-ink-500">{rate(r.metrics.cancellationRate, r.metrics.cancelledOrders, r.metrics.orders)}</td>
                <td className="px-4 py-3 text-ink-700">{r.metrics.codOrders}</td>
                <td className="px-4 py-3 text-ink-700">{r.metrics.onlineOrders}</td>
                <td className="px-4 py-3 font-mono text-ink-700">{formatPrice(r.metrics.aov)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
