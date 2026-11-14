import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, OrderStatus } from "@prisma/client";
import { getOrderById } from "@/lib/checkout/order-service";

export type AdminOrderSortKey = "newest" | "oldest" | "total_asc" | "total_desc";

export interface AdminOrderListFilters {
  /** Matches order number or customer email. */
  q?: string;
  status?: OrderStatus;
  sort?: AdminOrderSortKey;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

function resolveOrderBy(sort: AdminOrderSortKey): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "total_asc":
      return { total: "asc" };
    case "total_desc":
      return { total: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

/** Mirrors src/lib/data/admin-products.ts's search/filter/sort/pagination shape. */
export async function getAdminOrderList(filters: AdminOrderListFilters = {}) {
  const { q, status, sort = "newest", page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status;
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [{ orderNumber: { contains: term } }, { customerEmail: { contains: term } }];
  }

  const orderBy = resolveOrderBy(sort);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: true, payment: true },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

/** Reuses order-service.ts's existing getOrderById() — admin has no extra ownership restriction. */
export async function getAdminOrderById(orderId: string) {
  return getOrderById(orderId);
}
