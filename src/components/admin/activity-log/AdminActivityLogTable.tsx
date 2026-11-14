"use client";

import { Fragment, useState } from "react";

interface AdminActivityLogItem {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
  "order.status_changed": "Order status changed",
  "order.shipment_updated": "Order shipment updated",
  "user.cod_restricted": "COD restricted (automatic)",
  "user.cod_restricted_manual": "COD restricted (manual)",
  "user.cod_restriction_lifted": "COD restriction lifted",
  "product.created": "Product created",
  "product.updated": "Product updated",
  "product.archived": "Product archived",
  "product.restored": "Product restored",
  "product.bulk_updated": "Products bulk-updated",
  "product.imported": "Products imported",
};

const METADATA_KEY_LABELS: Record<string, string> = {
  previousStatus: "Previous status",
  newStatus: "New status",
  statusReason: "Reason",
  previousCodStatus: "Previously restricted",
  newCodStatus: "Now restricted",
  reason: "Reason",
  performedBy: "Performed by",
  qualifyingIncidentCount: "Qualifying incidents",
  action: "Action",
  productName: "Product name",
  sku: "SKU",
  categoryId: "Category ID",
  price: "Price",
  status: "Status",
  stockAvailable: "Stock available",
  operation: "Operation",
  affectedProductCount: "Products affected",
  affectedProductIds: "Product IDs (sample)",
  idsTruncated: "List truncated",
  changedFields: "Changed fields",
  created: "Created",
  updated: "Updated",
  unchanged: "Unchanged",
  failed: "Failed",
  previousCourierName: "Previous courier",
  newCourierName: "New courier",
  previousTrackingNumber: "Previous tracking number",
  newTrackingNumber: "New tracking number",
};

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  slug: "Slug",
  sku: "SKU",
  price: "Price",
  discountPrice: "Compare-at price",
  barcode: "Barcode",
  brand: "Brand",
  weightGrams: "Weight (g)",
  dimensions: "Dimensions",
  tags: "Tags",
  status: "Status",
  categoryId: "Category",
  themeId: "Theme",
  lowStockAt: "Low-stock threshold",
  returnPolicyOverride: "Return policy override",
  description: "Description",
  "attributes.material": "Material",
  "attributes.color": "Color",
  "attributes.width": "Width",
  "attributes.height": "Height",
  "attributes.careInstructions": "Care instructions",
};

/** Dedicated before -> after table for product.updated's {changedFields, before, after} shape — clearer than a flat key:value list for a diff. */
function ProductUpdateDetail({ changedFields, before, after }: { changedFields: string[]; before: Record<string, unknown>; after: Record<string, unknown> }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-ink-400">
          <th className="pr-4 pb-1 text-left font-normal">Field</th>
          <th className="pr-4 pb-1 text-left font-normal">Before</th>
          <th className="pb-1 text-left font-normal">After</th>
        </tr>
      </thead>
      <tbody>
        {changedFields.map((field) => (
          <tr key={field}>
            <td className="py-0.5 pr-4 text-ink-500">{FIELD_LABELS[field] ?? field}</td>
            <td className="py-0.5 pr-4 text-ink-700">{field in before ? formatMetadataValue(before[field]) : "(description text — not shown)"}</td>
            <td className="py-0.5 text-ink-700">{field in after ? formatMetadataValue(after[field]) : "(description text — not shown)"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Clean key:value list, never a raw JSON blob — and only ever rendered behind "Inspect", never shown by default. */
function MetadataDetail({ metadata }: { metadata: Record<string, unknown> }) {
  if (Array.isArray(metadata.changedFields) && metadata.before && metadata.after) {
    return (
      <ProductUpdateDetail
        changedFields={metadata.changedFields as string[]}
        before={metadata.before as Record<string, unknown>}
        after={metadata.after as Record<string, unknown>}
      />
    );
  }

  const entries = Object.entries(metadata);
  if (entries.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3 sm:justify-start">
          <dt className="text-ink-400">{METADATA_KEY_LABELS[key] ?? key}</dt>
          <dd className="text-ink-700">{formatMetadataValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminActivityLogTable({
  initialItems,
  initialPagination,
  actionOptions,
}: {
  initialItems: AdminActivityLogItem[];
  initialPagination: PaginationInfo;
  actionOptions: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load(page: number, nextAction = action) {
    setBusy(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (nextAction) params.set("action", nextAction);
      const res = await fetch(`/api/admin/activity-log?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setPagination(json.data.pagination);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            load(1, e.target.value);
          }}
          className="border border-ink-100 bg-bone px-3 py-1.5 text-sm focus:border-brass focus:outline-none"
        >
          <option value="">All actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a] ?? a}
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
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-500">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink-700">{ACTION_LABELS[item.action] ?? item.action}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {item.user.name} <span className="text-xs text-ink-300">({item.user.role})</span>
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {item.entity ? `${item.entity}${item.entityId ? ` · ${item.entityId.slice(0, 10)}…` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.metadata && (
                      <button
                        type="button"
                        className="text-brass-600 hover:underline"
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      >
                        {expanded === item.id ? "Hide" : "Inspect"}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === item.id && item.metadata && (
                  <tr>
                    <td colSpan={5} className="border-t border-ink-100 bg-bone-100 px-4 py-3 text-xs">
                      <MetadataDetail metadata={item.metadata} />
                      {item.ipAddress && <p className="mt-2 text-ink-300">IP: {item.ipAddress}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  No activity recorded yet.
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
