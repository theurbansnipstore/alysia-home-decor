import { formatPrice } from "@/lib/utils";
import { CITY_TIER_LABELS } from "@/lib/analytics/city-tiers";
import type { CityTierBreakdown } from "@/lib/data/admin-city-analytics";

function rate(value: number | null, numerator: number, denominator: number): string {
  if (value === null) return `— (${numerator}/${denominator})`;
  return `${value.toFixed(1)}% (${numerator}/${denominator})`;
}

/**
 * "Orders by City Tier" (Module 25 Part 7). A table, not a KpiCard grid —
 * 13 metrics × 4 tiers as cards would be 52 cards, unreadable; rows-of-
 * metrics-per-tier is the same shape Part 8's city table already asks for,
 * just at tier granularity.
 */
export default function CityTierTable({ tiers }: { tiers: CityTierBreakdown[] }) {
  return (
    <div className="overflow-x-auto border border-ink-100 bg-bone">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Tier</th>
            <th className="px-4 py-3">Orders</th>
            <th className="px-4 py-3">Gross Sales</th>
            <th className="px-4 py-3">Net Sales</th>
            <th className="px-4 py-3">Delivered</th>
            <th className="px-4 py-3">Delivered Revenue</th>
            <th className="px-4 py-3">Cancelled</th>
            <th className="px-4 py-3">Returned</th>
            <th className="px-4 py-3">Return Rate</th>
            <th className="px-4 py-3">Cancellation Rate</th>
            <th className="px-4 py-3">COD</th>
            <th className="px-4 py-3">Online</th>
            <th className="px-4 py-3">COD Delivered Rate</th>
            <th className="px-4 py-3">AOV</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {tiers.map(({ tier, metrics: m }) => (
            <tr key={tier}>
              <td className="px-4 py-3 font-medium text-ink">{CITY_TIER_LABELS[tier]}</td>
              <td className="px-4 py-3 text-ink-700">{m.orders}</td>
              <td className="px-4 py-3 text-ink-700">{formatPrice(m.grossSales)}</td>
              <td className="px-4 py-3 text-ink-700">{formatPrice(m.netSales)}</td>
              <td className="px-4 py-3 text-ink-700">{m.deliveredOrders}</td>
              <td className="px-4 py-3 text-ink-700">{formatPrice(m.deliveredRevenue)}</td>
              <td className="px-4 py-3 text-ink-700">{m.cancelledOrders}</td>
              <td className="px-4 py-3 text-ink-700">{m.returnedOrders}</td>
              <td className="px-4 py-3 text-ink-500">{rate(m.returnRate, m.returnedOrders, m.deliveredOrders)}</td>
              <td className="px-4 py-3 text-ink-500">{rate(m.cancellationRate, m.cancelledOrders, m.orders)}</td>
              <td className="px-4 py-3 text-ink-700">{m.codOrders}</td>
              <td className="px-4 py-3 text-ink-700">{m.onlineOrders}</td>
              <td className="px-4 py-3 text-ink-500">{rate(m.codDeliveredRate, m.codDeliveredCount, m.codOrders)}</td>
              <td className="px-4 py-3 font-mono text-ink-700">{formatPrice(m.aov)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-ink-100 px-4 py-2 text-xs text-ink-400">
        Return rate = returned ÷ delivered orders in this tier (not all orders — a return can only happen to something delivered). Cancellation rate =
        cancelled ÷ all orders in this tier. "—" means no baseline to compute a rate from (shown as 0/0).
      </p>
    </div>
  );
}
