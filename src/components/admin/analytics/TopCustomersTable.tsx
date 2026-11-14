import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { TopCustomer } from "@/lib/data/admin-analytics";

export default function TopCustomersTable({ customers }: { customers: TopCustomer[] }) {
  if (customers.length === 0) {
    return <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No customer orders yet.</p>;
  }

  return (
    <div className="overflow-x-auto border border-ink-100 bg-bone">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Orders</th>
            <th className="px-4 py-3">Lifetime Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {customers.map((c) => (
            <tr key={c.userId}>
              <td className="px-4 py-3">
                <Link href={`/admin/customers/${c.userId}`} className="text-ink hover:text-brass-600">
                  {c.name}
                </Link>
                <div className="text-xs text-ink-500">{c.email}</div>
              </td>
              <td className="px-4 py-3 text-ink-700">{c.orderCount}</td>
              <td className="px-4 py-3 font-medium text-ink">{formatPrice(c.lifetimeRevenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
