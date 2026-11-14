import { requireRole } from "@/lib/session";
import { DASHBOARD_OVERVIEW_ROLES } from "@/lib/admin/dashboard-roles";
import { resolveDateRange, type RangePreset } from "@/lib/analytics/date-ranges";
import { getAdminAnalytics } from "@/lib/data/admin-analytics";
import { getCityTierAnalytics } from "@/lib/data/admin-city-analytics";
import { formatPrice } from "@/lib/utils";
import CityTierTable from "@/components/admin/analytics/CityTierTable";
import CityBreakdownTable from "@/components/admin/analytics/CityBreakdownTable";
import CodRiskByTierTable from "@/components/admin/analytics/CodRiskByTierTable";
import DateRangeSelector from "@/components/admin/analytics/DateRangeSelector";
import KpiCard from "@/components/admin/analytics/KpiCard";
import RevenueChart from "@/components/admin/analytics/RevenueChart";
import OrdersStatusPanel from "@/components/admin/analytics/OrdersStatusPanel";
import TopProductsTable from "@/components/admin/analytics/TopProductsTable";
import CategoryPerformanceTable from "@/components/admin/analytics/CategoryPerformanceTable";
import InventoryInsightsPanel from "@/components/admin/analytics/InventoryInsightsPanel";
import RecentActivityPanel from "@/components/admin/analytics/RecentActivityPanel";
import PaymentPerformancePanel from "@/components/admin/analytics/PaymentPerformancePanel";
import CodRiskSection from "@/components/admin/analytics/CodRiskSection";
import ReturnedProductsTable from "@/components/admin/analytics/ReturnedProductsTable";
import TopCustomersTable from "@/components/admin/analytics/TopCustomersTable";

interface Props {
  searchParams: { preset?: string; from?: string; to?: string };
}

const VALID_PRESETS: RangePreset[] = ["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "thisYear", "custom"];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-3">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  await requireRole(DASHBOARD_OVERVIEW_ROLES);

  const preset = VALID_PRESETS.includes(searchParams.preset as RangePreset) ? (searchParams.preset as RangePreset) : "last30";
  const range = resolveDateRange(preset, searchParams.from, searchParams.to);
  const [data, cityAnalytics] = await Promise.all([getAdminAnalytics(range), getCityTierAnalytics(range)]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl text-ink">Analytics</h1>
          <p className="text-xs text-ink-400">{range.label}</p>
        </div>
      </div>

      <DateRangeSelector current={preset} from={searchParams.from} to={searchParams.to} />

      <Section title="Business Health" subtitle="Gross vs. net, and where value was lost this period">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Gross Sales" value={formatPrice(data.business.grossSales)} hint="Every order, any status" />
          <KpiCard label="Net Sales" value={formatPrice(data.business.netSales)} hint="Excludes cancelled/returned/refunded" />
          <KpiCard label="Delivered Sales" value={formatPrice(data.business.deliveredSales)} />
          <KpiCard label="Order Success Rate" value={`${data.business.orderSuccessRate.toFixed(1)}%`} hint="Delivered / total orders" />
          <KpiCard label="Cancelled Value" value={formatPrice(data.business.cancelledValue)} warn={data.business.cancelledValue > 0} />
          <KpiCard label="Returned Value" value={formatPrice(data.business.returnedValue)} warn={data.business.returnedValue > 0} />
          <KpiCard label="Prepaid Share" value={`${data.business.prepaidShare.toFixed(1)}%`} hint="Online vs. COD orders" />
          <KpiCard label="Inventory Value" value={formatPrice(data.business.inventoryValue)} hint="Current snapshot" />
        </div>
      </Section>

      <Section title="Sales">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total Revenue" value={formatPrice(data.sales.revenue)} currentRaw={data.sales.revenue} previous={data.sales.previousRevenue} />
          <KpiCard label="Orders" value={data.sales.orders} currentRaw={data.sales.orders} previous={data.sales.previousOrders} />
          <KpiCard label="Average Order Value" value={formatPrice(data.sales.aov)} currentRaw={data.sales.aov} previous={data.sales.previousAov} />
          <KpiCard
            label="Paid / Completed Orders"
            value={data.sales.completedOrders}
            currentRaw={data.sales.completedOrders}
            previous={data.sales.previousCompletedOrders}
          />
        </div>
      </Section>

      <Section title="Customers">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <KpiCard label="Total Customers" value={data.customers.totalCustomers} hint="All time" />
          <KpiCard
            label="New Customers"
            value={data.customers.newCustomers}
            currentRaw={data.customers.newCustomers}
            previous={data.customers.previousNewCustomers}
          />
          <KpiCard
            label="Returning Customers"
            value={data.customers.returningCustomers}
            currentRaw={data.customers.returningCustomers}
            previous={data.customers.previousReturningCustomers}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 border border-ink-100 bg-bone p-4 text-sm sm:grid-cols-3">
          <p className="text-ink-600">
            Avg. order value / customer <span className="float-right font-medium text-ink">{formatPrice(data.customers.avgCustomerOrderValue)}</span>
          </p>
          <p className="text-ink-600">
            Orders per customer <span className="float-right font-medium text-ink">{data.customers.ordersPerCustomer.toFixed(2)}</span>
          </p>
          <p className="text-ink-600">
            Repeat purchase rate <span className="float-right font-medium text-ink">{data.customers.repeatPurchaseRate.toFixed(1)}%</span>
          </p>
        </div>
      </Section>

      <Section title="Products">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total Products" value={data.inventory.stats.totalProducts} />
          <KpiCard label="In Stock" value={data.inventory.stats.inStock} />
          <KpiCard label="Low Stock" value={data.inventory.stats.lowStock} warn={data.inventory.stats.lowStock > 0} />
          <KpiCard label="Out of Stock" value={data.inventory.stats.outOfStock} warn={data.inventory.stats.outOfStock > 0} />
        </div>
      </Section>

      <Section title="Revenue Over Time" subtitle={`Grouped by ${range.granularity}`}>
        <RevenueChart points={data.revenueSeries} />
      </Section>

      <Section title="Orders" subtitle="Cancelled, returned, and failed payments in this period">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OrdersStatusPanel data={data.orders} />
          </div>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            <KpiCard label="Cancelled" value={data.orders.cancelled} warn={data.orders.cancelled > 0} />
            <KpiCard label="Returned" value={data.orders.returned} warn={data.orders.returned > 0} />
            <KpiCard label="Failed Payments" value={data.orders.failedPayments} warn={data.orders.failedPayments > 0} />
          </div>
        </div>
      </Section>

      <Section title="Orders by City Tier">
        <CityTierTable tiers={cityAnalytics.byTier} />
      </Section>

      <Section title="COD / Payment Risk by City Tier">
        <CodRiskByTierTable tiers={cityAnalytics.byTier} />
      </Section>

      <Section title="City Breakdown" subtitle="One row per distinct shipping city recorded on an order in this period">
        <CityBreakdownTable rows={cityAnalytics.byCity} />
      </Section>

      <Section title="Payment Performance">
        <PaymentPerformancePanel data={data.payments} />
      </Section>

      <Section title="COD / Order Risk" subtitle="Only orders proven to be refused/not accepted count toward risk — not every return">
        <CodRiskSection codRisk={data.codRisk} reasonBreakdown={data.returns.reasonBreakdown} />
      </Section>

      <Section title="Top Products" subtitle="Ranked by revenue in this period">
        <TopProductsTable products={data.topProducts} />
      </Section>

      <Section title="Returned Products" subtitle={`Return rate ${data.returns.returnRate.toFixed(1)}% · Cancellation rate ${data.returns.cancellationRate.toFixed(1)}%`}>
        <ReturnedProductsTable products={data.returns.topReturnedProducts} />
      </Section>

      <Section title="Category Performance">
        <CategoryPerformanceTable categories={data.categories} />
      </Section>

      <Section title="Top Customers" subtitle="By lifetime revenue, all time">
        <TopCustomersTable customers={data.topCustomers} />
      </Section>

      <Section title="Inventory Insights">
        <InventoryInsightsPanel data={data.inventory} />
      </Section>

      <Section title="Recent Activity" subtitle="Always shows the latest — independent of the date filter above">
        <RecentActivityPanel data={data.activity} />
      </Section>
    </div>
  );
}
