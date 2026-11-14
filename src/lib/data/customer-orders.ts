import "server-only";
import { prisma } from "@/lib/prisma";
import { getOrderById } from "@/lib/checkout/order-service";

/** Newest first — the only list query needed, so no filters/pagination yet. */
export async function getCustomerOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true, payment: true },
  });
}

/**
 * Reuses order-service.ts's existing getOrderById() (unmodified) rather
 * than a second identical query, then applies the ownership check here.
 * Ownership mismatch and "doesn't exist" both return null — same pattern
 * already established by getAddressById() in src/lib/data/addresses.ts —
 * so the route can return a uniform 404 either way.
 */
export async function getCustomerOrderById(userId: string, orderId: string) {
  const order = await getOrderById(orderId);
  if (!order || order.userId !== userId) return null;
  return order;
}
