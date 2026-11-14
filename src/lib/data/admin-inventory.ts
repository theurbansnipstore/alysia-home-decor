import "server-only";
import { prisma } from "@/lib/prisma";
import { getProductIdsByStockStatus } from "@/lib/inventory/stock-service";

export interface InventoryWatchlistItem {
  id: string;
  name: string;
  sku: string;
  stockAvailable: number;
  lowStockAt: number;
  status: string;
}

/** Out-of-stock and low-stock products together, worst-first — the
 *  dashboard's "needs attention" list. Archived products are excluded, same
 *  as getInventoryStats(), since they're no longer sellable. */
export async function getInventoryWatchlist(limit = 25): Promise<InventoryWatchlistItem[]> {
  const [outIds, lowIds] = await Promise.all([getProductIdsByStockStatus("out"), getProductIdsByStockStatus("low")]);
  const ids = [...outIds, ...lowIds];
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: { not: "ARCHIVED" } },
    select: { id: true, name: true, sku: true, stockAvailable: true, lowStockAt: true, status: true },
    orderBy: { stockAvailable: "asc" },
    take: limit,
  });

  return products;
}
