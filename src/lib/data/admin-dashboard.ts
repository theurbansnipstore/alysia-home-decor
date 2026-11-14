import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";

/**
 * "Sales" = total value of every order that isn't cancelled/returned/
 * refunded. Deliberately NOT based on Payment.status: COD orders are
 * never marked PAID in this codebase (status-service.ts's own comment —
 * "COD orders are never PAID pre-delivery" — confirms Payment.status only
 * ever reaches PAID via the Razorpay finalize path). Gating "sales" on
 * Payment.status would silently exclude every COD order, which is most of
 * this store's volume. This mirrors the standard e-commerce-dashboard
 * convention (gross order value, excluding cancelled/returned/refunded)
 * and needs no schema change.
 */
const EXCLUDED_SALES_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED", "REFUNDED"];

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  total: string;
  createdAt: Date;
}

export interface DashboardLowStockProduct {
  id: string;
  name: string;
  stockAvailable: number;
  lowStockAt: number;
}

export interface DashboardOverview {
  totalSales: number;
  orderCount: number;
  productCount: number;
  customerCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReviewCount: number;
  recentOrders: DashboardRecentOrder[];
  lowStockProducts: DashboardLowStockProduct[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [salesAgg, orderCount, productCount, customerCount, pendingReviewCount, recentOrdersRaw, activeProducts] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: { notIn: EXCLUDED_SALES_STATUSES } },
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, orderNumber: true, customerName: true, status: true, total: true, createdAt: true },
      }),
      // Catalog is small enough (see Products admin) to filter in JS rather
      // than needing a raw-SQL column-to-column comparison for
      // stockAvailable <= lowStockAt, which Prisma's query API can't
      // express directly without $queryRaw.
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, stockAvailable: true, lowStockAt: true },
      }),
    ]);

  const lowStockProducts = activeProducts
    .filter((p) => p.stockAvailable > 0 && p.stockAvailable <= p.lowStockAt)
    .sort((a, b) => a.stockAvailable - b.stockAvailable)
    .slice(0, 5);
  const outOfStockCount = activeProducts.filter((p) => p.stockAvailable === 0).length;
  const lowStockCount = activeProducts.filter((p) => p.stockAvailable > 0 && p.stockAvailable <= p.lowStockAt).length;

  return {
    totalSales: salesAgg._sum.total ? parseFloat(salesAgg._sum.total.toString()) : 0,
    orderCount,
    productCount,
    customerCount,
    lowStockCount,
    outOfStockCount,
    pendingReviewCount,
    recentOrders: recentOrdersRaw.map((o) => ({ ...o, total: o.total.toString() })),
    lowStockProducts,
  };
}
