import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { CUSTOMER_AREA_ROLES, canManageCodRisk } from "@/lib/admin/customer-roles";
import { getAdminCustomerById } from "@/lib/data/admin-customers";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import StarRating from "@/components/products/StarRating";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import CodRiskPanel from "@/components/admin/customers/CodRiskPanel";

export default async function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const session = await requireRole(CUSTOMER_AREA_ROLES);
  const customer = await getAdminCustomerById(params.id);
  if (!customer) notFound();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Customers", href: "/admin/customers" }, { label: customer.name }]} />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border border-ink-100 bg-bone p-5">
        <div>
          <h1 className="font-display text-2xl text-ink">{customer.name}</h1>
          <p className="mt-1 text-sm text-ink-500">{customer.email}</p>
          {customer.phone && <p className="text-sm text-ink-500">{customer.phone}</p>}
          <p className="mt-2 text-xs text-ink-300">
            Joined {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(customer.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-2 py-0.5 text-xs ${customer.isBlocked ? "bg-clay/10 text-clay" : "bg-green-100 text-green-800"}`}
          >
            {customer.isBlocked ? "Blocked" : "Active"}
          </span>
          <p className="text-xs text-ink-500">
            Wishlist: {customer.wishlistCount} item{customer.wishlistCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <CodRiskPanel customerId={customer.id} codRisk={customer.codRisk} canOverride={canManageCodRisk(session.role)} />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg text-ink">Orders ({customer.orders.length})</h2>
        {customer.orders.length === 0 ? (
          <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No orders yet.</p>
        ) : (
          <div className="divide-y divide-ink-100 border border-ink-100 bg-bone">
            {customer.orders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-bone-200"
              >
                <span className="font-mono text-ink">{o.orderNumber}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-ink">{formatPrice(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Reviews ({customer.reviews.length})</h2>
        {customer.reviews.length === 0 ? (
          <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No reviews yet.</p>
        ) : (
          <div className="divide-y divide-ink-100 border border-ink-100 bg-bone">
            {customer.reviews.map((r) => (
              <div key={r.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink">{r.product.name}</span>
                  <StarRating rating={r.rating} />
                </div>
                {r.title && <p className="mt-1 text-ink-700">{r.title}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
