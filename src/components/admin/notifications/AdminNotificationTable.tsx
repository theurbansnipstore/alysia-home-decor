"use client";

import { Fragment, useState } from "react";

interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const TYPE_LABELS: Record<string, string> = {
  "user.registered": "Registration",
  "order.placed": "Order placed",
  "order.confirmed": "Order confirmed",
  "order.packed": "Order packed",
  "order.shipped": "Order shipped",
  "order.out_for_delivery": "Out for delivery",
  "order.delivered": "Order delivered",
  "order.cancelled": "Order cancelled",
  "order.returned": "Order returned",
  "payment.failed": "Payment failed",
  "inventory.low_stock": "Low stock",
  "inventory.out_of_stock": "Out of stock",
};

export default function AdminNotificationTable({
  initialItems,
  initialPagination,
}: {
  initialItems: AdminNotificationItem[];
  initialPagination: PaginationInfo;
}) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load(page: number, nextUnreadOnly = unreadOnly, nextType = type) {
    setBusy(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (nextUnreadOnly) params.set("unreadOnly", "true");
      if (nextType) params.set("type", nextType);
      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setPagination(json.data.pagination);
      }
    } finally {
      setBusy(false);
    }
  }

  async function markRead(item: AdminNotificationItem) {
    if (item.readAt) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)));
    await fetch(`/api/admin/notifications/${item.id}/read`, { method: "POST" }).catch(() => {});
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              load(1, e.target.checked, type);
            }}
          />
          Unread only
        </label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            load(1, unreadOnly, e.target.value);
          }}
          className="border border-ink-100 bg-bone px-3 py-1.5 text-sm focus:border-brass focus:outline-none"
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {busy && <span className="text-xs text-ink-500">Loading…</span>}
      </div>

      <div className="overflow-x-auto border border-ink-100 bg-bone">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr className={item.readAt ? undefined : "bg-brass/5"}>
                  <td className="px-4 py-3 text-ink-500">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink-700">{TYPE_LABELS[item.type] ?? item.type}</td>
                  <td className="px-4 py-3 text-ink">{item.title}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {item.user.name} <span className="text-xs text-ink-300">({item.user.role})</span>
                  </td>
                  <td className="px-4 py-3">
                    {item.readAt ? (
                      <span className="text-ink-400">Read</span>
                    ) : (
                      <span className="font-medium text-brass-600">Unread</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="text-brass-600 hover:underline" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                        {expanded === item.id ? "Hide" : "Inspect"}
                      </button>
                      {!item.readAt && (
                        <button type="button" className="text-brass-600 hover:underline" onClick={() => markRead(item)}>
                          Mark read
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded === item.id && (
                  <tr>
                    <td colSpan={6} className="border-t border-ink-100 bg-bone-100 px-4 py-3 text-xs text-ink-700">
                      <p className="mb-1">{item.message}</p>
                      {item.link && (
                        <a href={item.link} className="text-brass-600 hover:underline">
                          {item.link}
                        </a>
                      )}
                      <p className="mt-1 text-ink-400">Recipient email: {item.user.email}</p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  No notifications match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-3 flex justify-center gap-2 text-xs text-ink-500">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => load(p)}
              className={p === pagination.page ? "font-medium text-brass-600" : "hover:text-brass-600"}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
