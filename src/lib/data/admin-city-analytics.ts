import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentMethod } from "@prisma/client";
import type { ResolvedRange } from "@/lib/analytics/date-ranges";
import { EXCLUDED_SALES_STATUSES } from "@/lib/data/admin-analytics";
import { classifyCity, cityGroupKey, cityDisplayLabel, type CityTier } from "@/lib/analytics/city-tiers";

function toNum(d: { toString(): string } | null | undefined): number {
  return d ? parseFloat(d.toString()) : 0;
}

interface OrderGeoRow {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  statusReason: string | null;
  total: number;
  city: string | null;
}

/**
 * Order.shippingAddress is a JSON snapshot (src/lib/checkout/snapshot.ts),
 * not a normalized column — MySQL can't groupBy into a JSON path portably,
 * so (matching this codebase's existing convention in
 * getOrderItemsInRange/getProductAndCategoryPerformance) this fetches the
 * flat row set once and aggregates in JS, rather than one Prisma query per
 * city/tier.
 */
async function getOrdersWithCity(start: Date, end: Date): Promise<OrderGeoRow[]> {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { status: true, paymentMethod: true, statusReason: true, total: true, shippingAddress: true },
  });

  return orders.map((o) => {
    const address = o.shippingAddress as unknown as { city?: string } | null;
    return {
      status: o.status,
      paymentMethod: o.paymentMethod,
      statusReason: o.statusReason,
      total: toNum(o.total),
      city: address?.city ?? null,
    };
  });
}

export interface GeoMetrics {
  orders: number;
  grossSales: number;
  netSales: number;
  deliveredOrders: number;
  deliveredRevenue: number;
  cancelledOrders: number;
  returnedOrders: number;
  /** Denominator is DELIVERED orders in this group, not all orders — a return can only ever happen to something that was delivered. Null when there were zero delivered orders (no baseline), not 0%. */
  returnRate: number | null;
  /** Denominator is ALL orders in this group — unlike returns, cancellation is a fate any placed order could meet, regardless of whether it ever shipped. */
  cancellationRate: number;
  codOrders: number;
  onlineOrders: number;
  codDeliveredCount: number;
  /** Null when there were zero COD orders in this group. */
  codDeliveredRate: number | null;
  /** COD orders returned with statusReason=CUSTOMER_REFUSED_COD specifically — never conflated with CUSTOMER_REQUESTED_RETURN (Module 21/25 semantics). */
  codRefusedCount: number;
  codRefusedRate: number | null;
  /** Net sales / count of orders contributing to net sales (excludes cancelled/returned/refunded) — mirrors the sitewide AOV convention in admin-analytics.ts. */
  aov: number;
}

function computeMetrics(rows: OrderGeoRow[]): GeoMetrics {
  const orders = rows.length;
  const grossSales = rows.reduce((sum, r) => sum + r.total, 0);
  const netRows = rows.filter((r) => !EXCLUDED_SALES_STATUSES.includes(r.status));
  const netSales = netRows.reduce((sum, r) => sum + r.total, 0);
  const delivered = rows.filter((r) => r.status === "DELIVERED");
  const cancelled = rows.filter((r) => r.status === "CANCELLED");
  const returned = rows.filter((r) => r.status === "RETURNED");
  const cod = rows.filter((r) => r.paymentMethod === "COD");
  const codDelivered = cod.filter((r) => r.status === "DELIVERED");
  const codRefused = cod.filter((r) => r.status === "RETURNED" && r.statusReason === "CUSTOMER_REFUSED_COD");

  return {
    orders,
    grossSales,
    netSales,
    deliveredOrders: delivered.length,
    deliveredRevenue: delivered.reduce((sum, r) => sum + r.total, 0),
    cancelledOrders: cancelled.length,
    returnedOrders: returned.length,
    returnRate: delivered.length > 0 ? (returned.length / delivered.length) * 100 : null,
    cancellationRate: orders > 0 ? (cancelled.length / orders) * 100 : 0,
    codOrders: cod.length,
    onlineOrders: orders - cod.length,
    codDeliveredCount: codDelivered.length,
    codDeliveredRate: cod.length > 0 ? (codDelivered.length / cod.length) * 100 : null,
    codRefusedCount: codRefused.length,
    codRefusedRate: cod.length > 0 ? (codRefused.length / cod.length) * 100 : null,
    aov: netRows.length > 0 ? netSales / netRows.length : 0,
  };
}

export interface CityTierBreakdown {
  tier: CityTier;
  metrics: GeoMetrics;
}

export interface CityBreakdownRow {
  cityKey: string;
  cityLabel: string;
  tier: CityTier;
  metrics: GeoMetrics;
}

export interface CityTierAnalytics {
  byTier: CityTierBreakdown[];
  byCity: CityBreakdownRow[];
}

const TIER_ORDER: CityTier[] = ["TIER_1", "TIER_2", "TIER_3", "UNCLASSIFIED"];

export async function getCityTierAnalytics(range: ResolvedRange): Promise<CityTierAnalytics> {
  const rows = await getOrdersWithCity(range.start, range.end);

  const byCityKey = new Map<string, OrderGeoRow[]>();
  for (const row of rows) {
    const key = cityGroupKey(row.city);
    const bucket = byCityKey.get(key) ?? [];
    bucket.push(row);
    byCityKey.set(key, bucket);
  }

  const byCity: CityBreakdownRow[] = Array.from(byCityKey.entries()).map(([cityKey, cityRows]) => ({
    cityKey,
    cityLabel: cityDisplayLabel(cityKey),
    tier: cityKey === "(no city)" ? "UNCLASSIFIED" : classifyCity(cityRows[0].city),
    metrics: computeMetrics(cityRows),
  }));
  byCity.sort((a, b) => b.metrics.orders - a.metrics.orders);

  const byTierRows = new Map<CityTier, OrderGeoRow[]>();
  for (const row of rows) {
    const tier = row.city ? classifyCity(row.city) : "UNCLASSIFIED";
    const bucket = byTierRows.get(tier) ?? [];
    bucket.push(row);
    byTierRows.set(tier, bucket);
  }

  const byTier: CityTierBreakdown[] = TIER_ORDER.map((tier) => ({
    tier,
    metrics: computeMetrics(byTierRows.get(tier) ?? []),
  }));

  return { byTier, byCity };
}
