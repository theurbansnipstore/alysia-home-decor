import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, OrderStatus } from "@prisma/client";
import { getCodRiskSummary, type CodRiskSummary } from "@/lib/orders/cod-risk";

const EXCLUDED_SALES_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED", "REFUNDED"];
const DEFAULT_PAGE_SIZE = 20;

export interface AdminCustomerListItem {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  reviewCount: number;
  createdAt: Date;
  isBlocked: boolean;
}

export interface AdminCustomerListFilters {
  q?: string;
  page?: number;
  pageSize?: number;
}

/** Read-mostly by design (Part 12) — no block/unblock action here; User.isBlocked has no established admin workflow yet, so it's shown, not editable. */
export async function getAdminCustomerList(filters: AdminCustomerListFilters = {}) {
  const { q, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [{ name: { contains: term } }, { email: { contains: term } }];
  }

  const [users, total, spendByUser] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isBlocked: true,
        _count: { select: { orders: true, reviews: true } },
      },
    }),
    prisma.user.count({ where }),
    // One groupBy for every customer's spend, rather than an N+1 sum per row.
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null }, status: { notIn: EXCLUDED_SALES_STATUSES } },
      _sum: { total: true },
    }),
  ]);

  const spendMap = new Map(
    spendByUser.map((s) => [s.userId as string, s._sum.total ? parseFloat(s._sum.total.toString()) : 0])
  );

  return {
    customers: users.map(
      (u): AdminCustomerListItem => ({
        id: u.id,
        name: u.name,
        email: u.email,
        orderCount: u._count.orders,
        totalSpent: spendMap.get(u.id) ?? 0,
        reviewCount: u._count.reviews,
        createdAt: u.createdAt,
        isBlocked: u.isBlocked,
      })
    ),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getAdminCustomerById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      isBlocked: true,
      role: true,
      orders: {
        orderBy: { createdAt: "desc" },
        select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          title: true,
          isApproved: true,
          createdAt: true,
          product: { select: { name: true, slug: true } },
        },
      },
      _count: { select: { wishlist: true } },
    },
  });
  // Scoped to role CUSTOMER — this screen isn't for looking up staff accounts.
  if (!user || user.role !== "CUSTOMER") return null;

  const codRisk = await getCodRiskSummary(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt,
    isBlocked: user.isBlocked,
    orders: user.orders.map((o) => ({ ...o, total: o.total.toString() })),
    reviews: user.reviews,
    wishlistCount: user._count.wishlist,
    codRisk,
  };
}

export type AdminCustomerDetail = NonNullable<Awaited<ReturnType<typeof getAdminCustomerById>>>;
export type { CodRiskSummary };
