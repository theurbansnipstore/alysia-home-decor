import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { STOCK_ADMIN_ROLES } from "@/lib/admin/roles";
import { prisma } from "@/lib/prisma";
import { getStockMovementHistory } from "@/lib/inventory/stock-service";
import StockAdjustmentPanel from "@/components/admin/products/StockAdjustmentPanel";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

/**
 * Narrow dedicated screen for INVENTORY_STAFF (also reachable by full-access
 * roles) — only stock quantity + movement history, none of the rest of the
 * product form.
 */
export default async function ProductStockPage({ params }: { params: { id: string } }) {
  await requireRole(STOCK_ADMIN_ROLES);

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, sku: true, stockAvailable: true, lowStockAt: true },
  });
  if (!product) notFound();

  const history = await getStockMovementHistory(product.id);

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: `Stock — ${product.name}` }]} />
      <StockAdjustmentPanel
        productId={product.id}
        productName={product.name}
        sku={product.sku}
        initialStock={product.stockAvailable}
        lowStockAt={product.lowStockAt}
        initialHistory={history}
      />
    </div>
  );
}
