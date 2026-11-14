import { formatPrice } from "@/lib/utils";
import type { PaymentAnalytics } from "@/lib/data/admin-analytics";
import KpiCard from "@/components/admin/analytics/KpiCard";

export default function PaymentPerformancePanel({ data }: { data: PaymentAnalytics }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="COD Orders" value={data.codOrders} hint={formatPrice(data.codRevenue)} />
        <KpiCard label="Online Orders" value={data.onlineOrders} hint={formatPrice(data.onlineRevenue)} />
        <KpiCard label="COD Delivered Rate" value={`${data.codDeliveredRate.toFixed(1)}%`} hint={`${data.codDeliveredCount} delivered`} />
        <KpiCard
          label="Online Payment Success"
          value={data.onlinePaymentSuccessRate === null ? "—" : `${data.onlinePaymentSuccessRate.toFixed(1)}%`}
          hint={`${data.onlinePaymentFailedCount} failed attempt${data.onlinePaymentFailedCount === 1 ? "" : "s"}`}
        />
      </div>
      <div className="border border-ink-100 bg-bone p-4 text-sm">
        <p className="text-ink-600">
          COD cancelled <span className="float-right font-medium text-ink">{data.codCancelledCount}</span>
        </p>
        <p className="mt-1.5 text-ink-600">
          COD returned <span className="float-right font-medium text-ink">{data.codReturnedCount}</span>
        </p>
        <p className="mt-1.5 text-ink-600">
          — of which refused / not accepted <span className="float-right font-medium text-clay">{data.codRefusedCount}</span>
        </p>
        <p className="mt-2 text-xs text-ink-300">Only orders marked with reason &quot;Customer refused / did not accept COD delivery&quot; count as refused — not every COD return.</p>
      </div>
    </div>
  );
}
