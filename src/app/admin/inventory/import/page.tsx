import { requireRole } from "@/lib/session";
import { STOCK_ADMIN_ROLES } from "@/lib/admin/roles";
import InventoryImportWizard from "@/components/admin/inventory/InventoryImportWizard";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function InventoryImportPage() {
  await requireRole(STOCK_ADMIN_ROLES);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Inventory", href: "/admin/inventory" }, { label: "Bulk Adjustment Import" }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Bulk Adjustment Import</h1>
      <InventoryImportWizard />
    </div>
  );
}
