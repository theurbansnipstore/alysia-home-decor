import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import {
  type ResolvedRange,
  bucketKey,
  bucketLabel,
  enumerateBuckets,
} from "@/lib/analytics/date-ranges";
import { getInventoryStats, getRecentStockMovements, type InventoryStats, type RecentMovement } from "@/lib/inventory/stock-service";
import { COD_RISK_WINDOW_DAYS } from "@/lib/orders/cod-risk";

/**
 * Same convention as src/lib/data/admin-dashboard.ts and admin-customers.ts:
 * "sales"/"revenue" = gross order value excluding cancelled/returned/
 * refunded. COD orders are never marked Payment.status=PAID pre-delivery
 * (status-service.ts's own comment), so gating on payment status would
 * silently drop most of this store's volume — order status is the correct
 * signal here, matching the two existing call sites.
 */
export const EXCLUDED_SALES_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED", "REFUNDED"];

function toNum(d: { toString(): string } | null | undefined): number {
  return d ? parseFloat(d.toString()) : 0;
}

// ---------- Sales KPIs ----------

export interface SalesKpis {
  revenue: number;
  previousRevenue: number;
  orders: number;
  previousOrders: number;
  aov: number;
  previousAov: number;
  completedOrders: number;
  previousCompletedOrders: number;
}

async function getSalesFigures(start: Date, end: Date) {
  const [salesAgg, periodOrderCount, completedOrderCount] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: start, lt: end }, status: { notIn: EXCLUDED_SALES_STATUSES } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.order.count({
      where: {
        createdAt: { gte: start, lt: end },
        OR: [{ status: "DELIVERED" }, { payment: { status: "PAID" } }],
      },
    }),
  ]);

  const revenue = toNum(salesAgg._sum.total);
  const salesOrderCount = salesAgg._count;
  return {
    revenue,
    orders: periodOrderCount,
    salesOrderCount,
    aov: salesOrderCount > 0 ? revenue / salesOrderCount : 0,
    completedOrders: completedOrderCount,
  };
}

export async function getSalesKpis(range: ResolvedRange): Promise<SalesKpis> {
  const [current, previous] = await Promise.all([
    getSalesFigures(range.start, range.end),
    getSalesFigures(range.previousStart, range.previousEnd),
  ]);
  return {
    revenue: current.revenue,
    previousRevenue: previous.revenue,
    orders: current.orders,
    previousOrders: previous.orders,
    aov: current.aov,
    previousAov: previous.aov,
    completedOrders: current.completedOrders,
    previousCompletedOrders: previous.completedOrders,
  };
}

// ---------- Revenue over time ----------

export interface RevenuePoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
}

export async function getRevenueSeries(range: ResolvedRange): Promise<RevenuePoint[]> {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: range.start, lt: range.end }, status: { notIn: EXCLUDED_SALES_STATUSES } },
    select: { total: true, createdAt: true },
  });

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (const key of enumerateBuckets(range.start, range.end, range.granularity)) {
    buckets.set(key, { revenue: 0, orders: 0 });
  }
  for (const o of orders) {
    const key = bucketKey(o.createdAt, range.granularity);
    const bucket = buckets.get(key) ?? { revenue: 0, orders: 0 };
    bucket.revenue += toNum(o.total);
    bucket.orders += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries()).map(([key, v]) => ({
    key,
    label: bucketLabel(key, range.granularity),
    revenue: v.revenue,
    orders: v.orders,
  }));
}

// ---------- Orders analytics ----------

export interface OrdersAnalytics {
  byStatus: { status: OrderStatus; count: number }[];
  cancelled: number;
  returned: number;
  failedPayments: number;
}

export async function getOrdersAnalytics(range: ResolvedRange): Promise<OrdersAnalytics> {
  const [statusGroups, failedPayments] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: range.start, lt: range.end } },
      _count: true,
    }),
    // Corrected in Module 21: no code path in this app ever writes
    // Payment.status="FAILED" (a failed Razorpay attempt never creates a
    // Payment row at all — see razorpay-finalize.ts). The old query here
    // (prisma.payment.count({status:"FAILED"...})) was structurally always
    // zero. countDistinctFailedPayments reads the real signal instead — see
    // its own comment for why it dedupes rather than counting rows.
    countDistinctFailedPayments(range.start, range.end),
  ]);

  const byStatus = statusGroups.map((g) => ({ status: g.status, count: g._count }));
  return {
    byStatus,
    cancelled: byStatus.find((s) => s.status === "CANCELLED")?.count ?? 0,
    returned: byStatus.find((s) => s.status === "RETURNED")?.count ?? 0,
    failedPayments,
  };
}

// ---------- Payment analytics (Module 21) ----------

export interface PaymentAnalytics {
  codOrders: number;
  onlineOrders: number;
  codRevenue: number;
  onlineRevenue: number;
  codDeliveredCount: number;
  codDeliveredRate: number;
  codCancelledCount: number;
  codReturnedCount: number;
  /** Of codReturnedCount, how many were specifically statusReason=CUSTOMER_REFUSED_COD — the only ones that count toward COD risk. Not every COD return is a refusal. */
  codRefusedCount: number;
  onlinePaymentSuccessCount: number;
  onlinePaymentFailedCount: number;
  /** Null (not 0%) when there were zero online attempts in range — no baseline to compute a rate from. */
  onlinePaymentSuccessRate: number | null;
}

/**
 * A failed Razorpay attempt never creates an Order/Payment row (audit
 * finding, Module 21) — its only trace is an admin-fan-out Notification,
 * which is ONE ROW PER RECIPIENT STAFF MEMBER for the same underlying
 * event (createNotificationsForRoles). Counting rows directly would
 * overcount by the number of staff holding the notified roles, so this
 * dedupes by the shared metadata.razorpayOrderId instead.
 */
async function countDistinctFailedPayments(start: Date, end: Date): Promise<number> {
  const rows = await prisma.notification.findMany({
    where: { type: "payment.failed", createdAt: { gte: start, lt: end } },
    select: { metadata: true },
  });
  const ids = new Set<string>();
  for (const r of rows) {
    const meta = r.metadata as { razorpayOrderId?: string } | null;
    if (meta?.razorpayOrderId) ids.add(meta.razorpayOrderId);
  }
  return ids.size;
}

export async function getPaymentAnalytics(range: ResolvedRange): Promise<PaymentAnalytics> {
  const dateFilter = { createdAt: { gte: range.start, lt: range.end } };

  const [methodCounts, methodRevenue, codDelivered, codCancelled, codReturned, codRefused, onlineSuccess, onlineFailed] =
    await Promise.all([
      prisma.order.groupBy({ by: ["paymentMethod"], where: dateFilter, _count: true }),
      prisma.order.groupBy({ by: ["paymentMethod"], where: { ...dateFilter, status: { notIn: EXCLUDED_SALES_STATUSES } }, _sum: { total: true } }),
      prisma.order.count({ where: { ...dateFilter, paymentMethod: "COD", status: "DELIVERED" } }),
      prisma.order.count({ where: { ...dateFilter, paymentMethod: "COD", status: "CANCELLED" } }),
      prisma.order.count({ where: { ...dateFilter, paymentMethod: "COD", status: "RETURNED" } }),
      prisma.order.count({ where: { ...dateFilter, paymentMethod: "COD", status: "RETURNED", statusReason: "CUSTOMER_REFUSED_COD" } }),
      prisma.payment.count({ where: { ...dateFilter, method: "RAZORPAY", status: "PAID" } }),
      countDistinctFailedPayments(range.start, range.end),
    ]);

  const codOrders = methodCounts.find((g) => g.paymentMethod === "COD")?._count ?? 0;
  const onlineOrders = methodCounts.filter((g) => g.paymentMethod !== "COD").reduce((sum, g) => sum + g._count, 0);
  const codRevenue = toNum(methodRevenue.find((g) => g.paymentMethod === "COD")?._sum.total);
  const onlineRevenue = methodRevenue.filter((g) => g.paymentMethod !== "COD").reduce((sum, g) => sum + toNum(g._sum.total), 0);
  const onlineAttempts = onlineSuccess + onlineFailed;

  return {
    codOrders,
    onlineOrders,
    codRevenue,
    onlineRevenue,
    codDeliveredCount: codDelivered,
    codDeliveredRate: codOrders > 0 ? (codDelivered / codOrders) * 100 : 0,
    codCancelledCount: codCancelled,
    codReturnedCount: codReturned,
    codRefusedCount: codRefused,
    onlinePaymentSuccessCount: onlineSuccess,
    onlinePaymentFailedCount: onlineFailed,
    onlinePaymentSuccessRate: onlineAttempts > 0 ? (onlineSuccess / onlineAttempts) * 100 : null,
  };
}

// ---------- Product & category performance (shared source query) ----------

interface RangedOrderItem {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  price: number;
  quantity: number;
  orderId: string;
}

/** Single query backing both Top Products and Category Performance — avoids fetching the same OrderItem set twice. */
async function getOrderItemsInRange(start: Date, end: Date): Promise<RangedOrderItem[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: { createdAt: { gte: start, lt: end }, status: { notIn: EXCLUDED_SALES_STATUSES } },
    },
    select: {
      orderId: true,
      productId: true,
      name: true,
      price: true,
      quantity: true,
      product: { select: { category: { select: { id: true, name: true } } } },
    },
  });

  return items.map((i) => ({
    productId: i.productId,
    productName: i.name,
    categoryId: i.product?.category.id ?? "unknown",
    categoryName: i.product?.category.name ?? "Unknown",
    price: toNum(i.price),
    quantity: i.quantity,
    orderId: i.orderId,
  }));
}

export interface TopProduct {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  orders: number;
  avgSellingPrice: number;
  categoryName: string;
  stockAvailable: number | null;
}

export interface CategoryPerformance {
  categoryId: string;
  name: string;
  revenue: number;
  unitsSold: number;
  orders: number;
}

export async function getProductAndCategoryPerformance(
  range: ResolvedRange,
  topLimit = 10
): Promise<{ topProducts: TopProduct[]; categories: CategoryPerformance[] }> {
  const items = await getOrderItemsInRange(range.start, range.end);

  const byProduct = new Map<string, { name: string; units: number; revenue: number; orders: Set<string>; categoryName: string }>();
  const byCategory = new Map<string, { name: string; units: number; revenue: number; orders: Set<string> }>();

  for (const item of items) {
    const p = byProduct.get(item.productId) ?? { name: item.productName, units: 0, revenue: 0, orders: new Set(), categoryName: item.categoryName };
    p.units += item.quantity;
    p.revenue += item.price * item.quantity;
    p.orders.add(item.orderId);
    byProduct.set(item.productId, p);

    const c = byCategory.get(item.categoryId) ?? { name: item.categoryName, units: 0, revenue: 0, orders: new Set() };
    c.units += item.quantity;
    c.revenue += item.price * item.quantity;
    c.orders.add(item.orderId);
    byCategory.set(item.categoryId, c);
  }

  const productIds = Array.from(byProduct.keys());
  const stockRows = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, stockAvailable: true } })
    : [];
  const stockMap = new Map(stockRows.map((p) => [p.id, p.stockAvailable]));

  const topProducts: TopProduct[] = Array.from(byProduct.entries())
    .map(([productId, v]) => ({
      productId,
      name: v.name,
      unitsSold: v.units,
      revenue: v.revenue,
      orders: v.orders.size,
      avgSellingPrice: v.units > 0 ? v.revenue / v.units : 0,
      categoryName: v.categoryName,
      stockAvailable: stockMap.get(productId) ?? null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topLimit);

  const categories: CategoryPerformance[] = Array.from(byCategory.entries())
    .map(([categoryId, v]) => ({ categoryId, name: v.name, revenue: v.revenue, unitsSold: v.units, orders: v.orders.size }))
    .sort((a, b) => b.revenue - a.revenue);

  return { topProducts, categories };
}

// ---------- Return / cancellation analytics (Module 21) ----------

export interface ReturnReasonBreakdown {
  reason: string;
  count: number;
}

export interface ReturnedProduct {
  productId: string;
  name: string;
  returnCount: number;
  returnedUnits: number;
  returnedValue: number;
}

export interface ReturnAnalytics {
  returnRate: number;
  cancellationRate: number;
  returnedValue: number;
  cancelledValue: number;
  deliveredValue: number;
  /** "not_recorded" covers every RETURNED/CANCELLED order that predates the statusReason field (Module 21) — shown explicitly rather than hidden, since silently omitting it would misrepresent how much reason data actually exists. */
  reasonBreakdown: ReturnReasonBreakdown[];
  topReturnedProducts: ReturnedProduct[];
}

export async function getReturnAnalytics(range: ResolvedRange, limit = 5): Promise<ReturnAnalytics> {
  const dateFilter = { createdAt: { gte: range.start, lt: range.end } };

  const [totalOrders, returnedAgg, cancelledAgg, deliveredAgg, reasonGroups, returnedItems] = await Promise.all([
    prisma.order.count({ where: dateFilter }),
    prisma.order.aggregate({ where: { ...dateFilter, status: "RETURNED" }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { ...dateFilter, status: "CANCELLED" }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { ...dateFilter, status: "DELIVERED" }, _sum: { total: true } }),
    prisma.order.groupBy({ by: ["statusReason"], where: { ...dateFilter, status: { in: ["RETURNED", "CANCELLED"] } }, _count: true }),
    prisma.orderItem.findMany({
      where: { order: { ...dateFilter, status: "RETURNED" } },
      select: { productId: true, name: true, price: true, quantity: true },
    }),
  ]);

  const byProduct = new Map<string, { name: string; count: number; units: number; value: number }>();
  for (const item of returnedItems) {
    const p = byProduct.get(item.productId) ?? { name: item.name, count: 0, units: 0, value: 0 };
    p.count += 1;
    p.units += item.quantity;
    p.value += toNum(item.price) * item.quantity;
    byProduct.set(item.productId, p);
  }
  const topReturnedProducts = Array.from(byProduct.entries())
    .map(([productId, v]) => ({ productId, name: v.name, returnCount: v.count, returnedUnits: v.units, returnedValue: v.value }))
    .sort((a, b) => b.returnedValue - a.returnedValue)
    .slice(0, limit);

  return {
    returnRate: totalOrders > 0 ? (returnedAgg._count / totalOrders) * 100 : 0,
    cancellationRate: totalOrders > 0 ? (cancelledAgg._count / totalOrders) * 100 : 0,
    returnedValue: toNum(returnedAgg._sum.total),
    cancelledValue: toNum(cancelledAgg._sum.total),
    deliveredValue: toNum(deliveredAgg._sum.total),
    reasonBreakdown: reasonGroups.map((g) => ({ reason: g.statusReason ?? "not_recorded", count: g._count })),
    topReturnedProducts,
  };
}

// ---------- Customer analytics ----------

export interface CustomerKpis {
  totalCustomers: number;
  newCustomers: number;
  previousNewCustomers: number;
  returningCustomers: number;
  previousReturningCustomers: number;
  avgCustomerOrderValue: number;
  ordersPerCustomer: number;
  repeatPurchaseRate: number;
}

async function getReturningCount(start: Date, end: Date): Promise<{ ordered: string[]; returning: number; salesRevenue: number; salesOrders: number }> {
  const [orderedRows, salesAgg] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: start, lt: end }, status: { notIn: EXCLUDED_SALES_STATUSES } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const orderedUserIds = orderedRows.map((r) => r.userId as string);
  let returning = 0;
  if (orderedUserIds.length > 0) {
    const priorRows = await prisma.order.findMany({
      where: { userId: { in: orderedUserIds }, createdAt: { lt: start } },
      select: { userId: true },
      distinct: ["userId"],
    });
    returning = priorRows.length;
  }

  return { ordered: orderedUserIds, returning, salesRevenue: toNum(salesAgg._sum.total), salesOrders: salesAgg._count };
}

export async function getCustomerKpis(range: ResolvedRange): Promise<CustomerKpis> {
  const [totalCustomers, newCustomers, previousNewCustomers, current, previous] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: range.start, lt: range.end } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: range.previousStart, lt: range.previousEnd } } }),
    getReturningCount(range.start, range.end),
    getReturningCount(range.previousStart, range.previousEnd),
  ]);

  const orderedCount = current.ordered.length;
  return {
    totalCustomers,
    newCustomers,
    previousNewCustomers,
    returningCustomers: current.returning,
    previousReturningCustomers: previous.returning,
    avgCustomerOrderValue: orderedCount > 0 ? current.salesRevenue / orderedCount : 0,
    ordersPerCustomer: orderedCount > 0 ? current.salesOrders / orderedCount : 0,
    repeatPurchaseRate: orderedCount > 0 ? (current.returning / orderedCount) * 100 : 0,
  };
}

// ---------- COD risk analytics (Module 21) ----------

export interface TopCustomer {
  userId: string;
  name: string;
  email: string;
  lifetimeRevenue: number;
  orderCount: number;
}

export interface CodRiskAnalytics {
  /** Qualifying (CUSTOMER_REFUSED_COD) incidents created within the selected date range — not the fixed 180-day policy window used for the actual restriction decision, which is independent of this page's filter. */
  qualifyingIncidentsInRange: number;
  codRevenueAtRisk: number;
  customersRestrictedInRange: number;
  /** Current snapshot, like Total Customers — unaffected by the date filter. */
  currentlyRestrictedTotal: number;
  /** Distinct customers with 2+ qualifying incidents within the actual policy window (COD_RISK_WINDOW_DAYS) — a leading indicator, independent of the page's date filter since it mirrors the real rule. */
  customersApproachingThreshold: number;
}

export async function getCodRiskAnalytics(range: ResolvedRange): Promise<CodRiskAnalytics> {
  const dateFilter = { createdAt: { gte: range.start, lt: range.end } };

  const [qualifyingAgg, restrictedInRange, currentlyRestrictedTotal, policyWindowIncidents] = await Promise.all([
    prisma.order.aggregate({
      where: { ...dateFilter, paymentMethod: "COD", status: "RETURNED", statusReason: "CUSTOMER_REFUSED_COD" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.user.count({ where: { codBlockedAt: { gte: range.start, lt: range.end } } }),
    prisma.user.count({ where: { codBlocked: true } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: {
        paymentMethod: "COD",
        status: "RETURNED",
        statusReason: "CUSTOMER_REFUSED_COD",
        userId: { not: null },
        createdAt: { gte: new Date(Date.now() - COD_RISK_WINDOW_DAYS * 86_400_000) },
      },
      _count: true,
    }),
  ]);

  return {
    qualifyingIncidentsInRange: qualifyingAgg._count,
    codRevenueAtRisk: toNum(qualifyingAgg._sum.total),
    customersRestrictedInRange: restrictedInRange,
    currentlyRestrictedTotal,
    customersApproachingThreshold: policyWindowIncidents.filter((g) => g._count >= 2).length,
  };
}

export async function getTopCustomers(limit = 10): Promise<TopCustomer[]> {
  const spendByUser = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { not: null }, status: { notIn: EXCLUDED_SALES_STATUSES } },
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: "desc" } },
    take: limit,
  });

  const userIds = spendByUser.map((s) => s.userId as string);
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return spendByUser
    .map((s) => {
      const user = userMap.get(s.userId as string);
      return {
        userId: s.userId as string,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
        lifetimeRevenue: toNum(s._sum.total),
        orderCount: s._count,
      };
    })
    .filter((c) => c.email);
}

// ---------- Inventory insights (reuses existing inventory service — no duplicated stock logic) ----------

export interface InventoryInsights {
  stats: InventoryStats;
  inventoryValue: number;
  recentMovements: RecentMovement[];
}

export async function getInventoryInsights(): Promise<InventoryInsights> {
  const [stats, recentMovements, priceRows] = await Promise.all([
    getInventoryStats(),
    getRecentStockMovements(5),
    prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, select: { price: true, stockAvailable: true } }),
  ]);

  const inventoryValue = priceRows.reduce((sum, p) => sum + toNum(p.price) * p.stockAvailable, 0);
  return { stats, inventoryValue, recentMovements };
}

// ---------- Recent activity (always latest, independent of the selected date range) ----------

export interface RecentActivity {
  recentOrders: { id: string; orderNumber: string; customerName: string; status: OrderStatus; total: string; createdAt: Date }[];
  recentCustomers: { id: string; name: string; email: string; createdAt: Date }[];
  recentReviews: { id: string; rating: number; title: string | null; isApproved: boolean; createdAt: Date; productName: string; userName: string }[];
}

export async function getRecentActivity(): Promise<RecentActivity> {
  const [recentOrders, recentCustomers, recentReviews] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, orderNumber: true, customerName: true, status: true, total: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        rating: true,
        title: true,
        isApproved: true,
        createdAt: true,
        product: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  return {
    recentOrders: recentOrders.map((o) => ({ ...o, total: o.total.toString() })),
    recentCustomers,
    recentReviews: recentReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      isApproved: r.isApproved,
      createdAt: r.createdAt,
      productName: r.product.name,
      userName: r.user.name,
    })),
  };
}

// ---------- Business health (Module 21) ----------

export interface BusinessHealth {
  /** Every order's total, regardless of status — distinct from "Revenue" (Sales KPIs), which already excludes cancelled/returned/refunded. */
  grossSales: number;
  netSales: number;
  cancelledValue: number;
  returnedValue: number;
  deliveredSales: number;
  orderSuccessRate: number;
  returnRate: number;
  cancellationRate: number;
  prepaidShare: number;
  inventoryValue: number;
}

export async function getBusinessHealth(range: ResolvedRange, returns: ReturnAnalytics, payments: PaymentAnalytics, inventoryValue: number): Promise<BusinessHealth> {
  const dateFilter = { createdAt: { gte: range.start, lt: range.end } };

  const [grossAgg, netAgg, deliveredCount, totalOrders] = await Promise.all([
    prisma.order.aggregate({ where: dateFilter, _sum: { total: true } }),
    prisma.order.aggregate({ where: { ...dateFilter, status: { notIn: EXCLUDED_SALES_STATUSES } }, _sum: { total: true } }),
    prisma.order.count({ where: { ...dateFilter, status: "DELIVERED" } }),
    prisma.order.count({ where: dateFilter }),
  ]);

  const totalOrdersForShare = payments.codOrders + payments.onlineOrders;

  return {
    grossSales: toNum(grossAgg._sum.total),
    netSales: toNum(netAgg._sum.total),
    cancelledValue: returns.cancelledValue,
    returnedValue: returns.returnedValue,
    deliveredSales: returns.deliveredValue,
    orderSuccessRate: totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0,
    returnRate: returns.returnRate,
    cancellationRate: returns.cancellationRate,
    prepaidShare: totalOrdersForShare > 0 ? (payments.onlineOrders / totalOrdersForShare) * 100 : 0,
    inventoryValue,
  };
}

// ---------- Aggregator ----------

export interface AdminAnalyticsData {
  sales: SalesKpis;
  revenueSeries: RevenuePoint[];
  orders: OrdersAnalytics;
  payments: PaymentAnalytics;
  returns: ReturnAnalytics;
  codRisk: CodRiskAnalytics;
  topProducts: TopProduct[];
  categories: CategoryPerformance[];
  customers: CustomerKpis;
  topCustomers: TopCustomer[];
  inventory: InventoryInsights;
  business: BusinessHealth;
  activity: RecentActivity;
}

/** Everything the /admin/analytics page needs, fetched in parallel. */
export async function getAdminAnalytics(range: ResolvedRange): Promise<AdminAnalyticsData> {
  const [sales, revenueSeries, orders, payments, returns, codRisk, perf, customers, topCustomers, inventory, activity] = await Promise.all([
    getSalesKpis(range),
    getRevenueSeries(range),
    getOrdersAnalytics(range),
    getPaymentAnalytics(range),
    getReturnAnalytics(range),
    getCodRiskAnalytics(range),
    getProductAndCategoryPerformance(range),
    getCustomerKpis(range),
    getTopCustomers(),
    getInventoryInsights(),
    getRecentActivity(),
  ]);

  const business = await getBusinessHealth(range, returns, payments, inventory.inventoryValue);

  return {
    sales,
    revenueSeries,
    orders,
    payments,
    returns,
    codRisk,
    topProducts: perf.topProducts,
    categories: perf.categories,
    customers,
    topCustomers,
    inventory,
    business,
    activity,
  };
}
