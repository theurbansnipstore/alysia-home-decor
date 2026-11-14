import Link from "next/link";
import { requireRole } from "@/lib/session";
import { CUSTOMER_AREA_ROLES } from "@/lib/admin/customer-roles";
import { getAdminCustomerList } from "@/lib/data/admin-customers";
import { formatPrice } from "@/lib/utils";
import Pagination from "@/components/products/Pagination";

interface Props {
  searchParams: Record<string, string | undefined>;
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  await requireRole(CUSTOMER_AREA_ROLES);

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const { customers, pagination } = await getAdminCustomerList({ q: searchParams.q, page });

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    params.set("page", String(p));
    return `/admin/customers?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Customers</h1>

      <form method="get" className="mb-6 flex gap-3 border border-ink-100 bg-bone p-4">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search name or email"
          className="w-full max-w-sm border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
        <button type="submit" className="border border-ink bg-ink px-5 py-2 text-sm text-bone-100 hover:bg-ink-700">
          Search
        </button>
      </form>

      <p className="mb-3 text-xs text-ink-500">
        {pagination.total} customer{pagination.total === 1 ? "" : "s"}
      </p>

      {customers.length === 0 ? (
        <p className="border border-ink-100 bg-bone p-8 text-center text-sm text-ink-500">No customers match this search.</p>
      ) : (
        <div className="overflow-x-auto border border-ink-100 bg-bone">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total Spent</th>
                <th className="px-4 py-3">Reviews</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="text-brass-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{c.email}</td>
                  <td className="px-4 py-3 text-ink-700">{c.orderCount}</td>
                  <td className="px-4 py-3 text-ink-700">{formatPrice(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-ink-700">{c.reviewCount}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs ${c.isBlocked ? "bg-clay/10 text-clay" : "bg-green-100 text-green-800"}`}>
                      {c.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} buildHref={buildHref} />
    </div>
  );
}
