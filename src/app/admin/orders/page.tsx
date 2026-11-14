import { requireRole } from "@/lib/session";
import { ORDER_AREA_ROLES } from "@/lib/admin/order-roles";
import { getAdminOrderList, type AdminOrderSortKey } from "@/lib/data/admin-orders";
import OrderFilters from "@/components/admin/orders/OrderFilters";
import OrderTable from "@/components/admin/orders/OrderTable";
import Pagination from "@/components/products/Pagination";
import type { OrderStatus } from "@prisma/client";

interface Props {
  searchParams: Record<string, string | undefined>;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireRole(ORDER_AREA_ROLES);

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const filters = {
    q: searchParams.q || undefined,
    status: (searchParams.status as OrderStatus) || undefined,
    sort: (searchParams.sort as AdminOrderSortKey) || undefined,
    page,
  };

  const { orders, pagination } = await getAdminOrderList(filters);

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.sort) params.set("sort", filters.sort);
    params.set("page", String(p));
    return `/admin/orders?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Orders</h1>

      <OrderFilters current={searchParams} />

      <p className="mb-3 text-xs text-ink-500">{pagination.total} order{pagination.total === 1 ? "" : "s"}</p>

      <OrderTable orders={orders} />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} buildHref={buildHref} />
    </div>
  );
}
