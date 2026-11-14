import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { CodRiskAnalytics, ReturnReasonBreakdown } from "@/lib/data/admin-analytics";
import KpiCard from "@/components/admin/analytics/KpiCard";

const REASON_LABELS: Record<string, string> = {
  CUSTOMER_REFUSED_COD: "Refused / not accepted (COD)",
  CUSTOMER_REQUESTED_RETURN: "Customer requested return",
  DELIVERY_FAILURE: "Delivery failure",
  DAMAGED: "Damaged in transit",
  OTHER: "Other",
  CUSTOMER_REQUESTED_CANCELLATION: "Customer requested cancellation",
  PAYMENT_ISSUE: "Payment issue",
  ADDRESS_ISSUE: "Address issue",
  SELLER_UNABLE_TO_FULFILL: "Seller unable to fulfill",
  PRODUCT_UNAVAILABLE: "Product unavailable",
  not_recorded: "Reason not recorded (pre-dates this feature)",
};

export default function CodRiskSection({ codRisk, reasonBreakdown }: { codRisk: CodRiskAnalytics; reasonBreakdown: ReturnReasonBreakdown[] }) {
  const totalReasons = reasonBreakdown.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Qualifying Incidents" value={codRisk.qualifyingIncidentsInRange} hint="Refused COD, this period" />
        <KpiCard label="COD Revenue at Risk" value={formatPrice(codRisk.codRevenueAtRisk)} />
        <KpiCard label="Currently Restricted" value={codRisk.currentlyRestrictedTotal} warn={codRisk.currentlyRestrictedTotal > 0} hint="All customers, now" />
        <KpiCard
          label="Approaching Threshold"
          value={codRisk.customersApproachingThreshold}
          warn={codRisk.customersApproachingThreshold > 0}
          hint="2+ incidents, last 180 days"
        />
      </div>

      <div className="border border-ink-100 bg-bone p-4">
        <h3 className="mb-2 text-sm font-medium text-ink">Cancellation / Return Reasons</h3>
        {totalReasons === 0 ? (
          <p className="text-xs text-ink-400">No cancelled or returned orders in this period.</p>
        ) : (
          <ul className="space-y-2">
            {reasonBreakdown
              .sort((a, b) => b.count - a.count)
              .map((r) => (
                <li key={r.reason} className="flex items-center gap-3 text-xs">
                  <span className="w-56 shrink-0 text-ink-600">{REASON_LABELS[r.reason] ?? r.reason}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-50">
                    <div className="h-full rounded-full bg-brass/70" style={{ width: `${(r.count / totalReasons) * 100}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-ink-700">{r.count}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-ink-300">
        See a customer&apos;s full incident history and manage restrictions from their{" "}
        <Link href="/admin/customers" className="text-brass-600 hover:underline">
          customer detail page
        </Link>
        .
      </p>
    </div>
  );
}
