import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { PRODUCT_AREA_ROLES } from "@/lib/admin/roles";
import { ORDER_AREA_ROLES } from "@/lib/admin/order-roles";
import { getResolvedBrandSettings } from "@/lib/settings/branding";
import AdminShell from "@/components/admin/AdminShell";

// Every /admin/* route nests under this shared shell, so its role gate must
// be the union of every admin area's roles — each area's own page/API
// routes still do the real, narrower authorization. Neither
// PRODUCT_AREA_ROLES nor ORDER_AREA_ROLES's own definition changes here.
const ADMIN_SHELL_ROLES = [...PRODUCT_AREA_ROLES, ...ORDER_AREA_ROLES];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [session, brand] = await Promise.all([requireRole(ADMIN_SHELL_ROLES), getResolvedBrandSettings()]);

  return (
    <AdminShell userName={session.name} role={session.role} brandName={brand.name}>
      {children}
    </AdminShell>
  );
}
