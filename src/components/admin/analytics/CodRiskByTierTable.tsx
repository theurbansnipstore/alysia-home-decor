import { CITY_TIER_LABELS } from "@/lib/analytics/city-tiers";
import type { CityTierBreakdown } from "@/lib/data/admin-city-analytics";

function rate(value: number | null, numerator: number, denominator: number): string {
  if (value === null) return `— (${numerator}/${denominator})`;
  return `${value.toFixed(1)}% (${numerator}/${denominator})`;
}

/**
 * "COD Refusal Rate" is strictly CUSTOMER_REFUSED_COD — never a general COD
 * return, and never conflated with CUSTOMER_REQUESTED_RETURN (a legitimate
 * post-delivery return is not evidence the customer refused delivery). Same
 * underlying per-tier data as CityTierTable — a separate, narrower table
 * because payment-risk is a distinct question from general sales performance.
 */
export default function CodRiskByTierTable({ tiers }: { tiers: CityTierBreakdown[] }) {
  return (
    <div className="overflow-x-auto border border-ink-100 bg-bone">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Tier</th>
            <th className="px-4 py-3">COD Orders</th>
            <th className="px-4 py-3">Online Orders</th>
            <th className="px-4 py-3">COD Delivered Rate</th>
            <th className="px-4 py-3">COD Refusal Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {tiers.map(({ tier, metrics: m }) => (
            <tr key={tier}>
              <td className="px-4 py-3 font-medium text-ink">{CITY_TIER_LABELS[tier]}</td>
              <td className="px-4 py-3 text-ink-700">{m.codOrders}</td>
              <td className="px-4 py-3 text-ink-700">{m.onlineOrders}</td>
              <td className="px-4 py-3 text-ink-500">{rate(m.codDeliveredRate, m.codDeliveredCount, m.codOrders)}</td>
              <td className="px-4 py-3 text-ink-500">{rate(m.codRefusedRate, m.codRefusedCount, m.codOrders)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
