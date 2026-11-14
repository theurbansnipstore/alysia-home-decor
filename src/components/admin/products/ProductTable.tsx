"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { formatPrice } from "@/lib/utils";
import { canManageProducts, canAdjustStock, canManageMarketing } from "@/lib/admin/roles";
import type { AdminProductListItem } from "@/lib/data/admin-products";
import type { BulkFilters } from "@/lib/validations/bulk-product";
import BulkEditModal from "@/components/admin/products/BulkEditModal";
import type { CategoryDTO, ThemeDTO } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  DRAFT: "bg-ink-100 text-ink-700",
  ARCHIVED: "bg-clay/10 text-clay",
};

interface ProductTableProps {
  products: AdminProductListItem[];
  role: Role;
  totalMatching: number;
  activeFilters: BulkFilters;
  categories: CategoryDTO[];
  themes: ThemeDTO[];
}

export default function ProductTable({ products, role, totalMatching, activeFilters, categories, themes }: ProductTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const canBulkEdit = canManageProducts(role);

  if (products.length === 0) {
    return <p className="border border-ink-100 bg-bone p-8 text-center text-sm text-ink-500">No products match these filters.</p>;
  }

  function clearSelection() {
    setSelected(new Set());
    setSelectAllMatching(false);
  }

  function toggleOne(id: string) {
    setSelectAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOnPageSelected = products.every((p) => selected.has(p.id));

  function toggleAllOnPage() {
    setSelectAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) products.forEach((p) => next.delete(p.id));
      else products.forEach((p) => next.add(p.id));
      return next;
    });
  }

  const selectionCount = selectAllMatching ? totalMatching : selected.size;
  const selection = selectAllMatching
    ? ({ mode: "filtered", filters: activeFilters } as const)
    : ({ mode: "ids", productIds: Array.from(selected) } as const);

  const exportHref = selectAllMatching
    ? `/api/admin/products/export?scope=filtered&format=csv&${new URLSearchParams(
        Object.fromEntries(Object.entries(activeFilters).filter(([, v]) => v !== undefined) as [string, string][])
      ).toString()}`
    : `/api/admin/products/export?scope=selected&format=csv&ids=${Array.from(selected).join(",")}`;

  return (
    <div>
      <div className="overflow-x-auto border border-ink-100 bg-bone">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              {canBulkEdit && (
                <th className="px-4 py-3">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Select all on page" />
                </th>
              )}
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {products.map((p) => (
              <tr key={p.id} className={selected.has(p.id) ? "bg-brass/5" : undefined}>
                {canBulkEdit && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id) || selectAllMatching}
                      disabled={selectAllMatching}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                )}
                <td className="flex items-center gap-3 px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail ?? "/patterns/jali.svg"} alt="" className="h-10 w-10 object-cover" />
                  <span className="text-ink">{p.name}</span>
                </td>
                <td className="px-4 py-3 text-ink-500">{p.sku}</td>
                <td className="px-4 py-3 text-ink-500">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-700">
                  {formatPrice(p.discountPrice ?? p.price)}
                  {p.discountPrice && <span className="ml-1 text-xs text-ink-300 line-through">{formatPrice(p.price)}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={p.stockAvailable <= p.lowStockAt ? "text-clay" : "text-ink-700"}>{p.stockAvailable}</span>
                    {p.stockAvailable <= 0 ? (
                      <span className="whitespace-nowrap bg-clay/10 px-2 py-0.5 text-xs text-clay">OUT OF STOCK</span>
                    ) : p.stockAvailable <= p.lowStockAt ? (
                      <span className="whitespace-nowrap bg-brass/10 px-2 py-0.5 text-xs text-brass-700">LOW STOCK</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs ${STATUS_STYLES[p.status] ?? ""}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    {canManageProducts(role) && (
                      <Link href={`/admin/products/${p.id}`} className="text-brass-600 hover:underline">
                        Edit
                      </Link>
                    )}
                    {canAdjustStock(role) && (
                      <Link href={`/admin/products/${p.id}/stock`} className="text-brass-600 hover:underline">
                        Stock
                      </Link>
                    )}
                    {canManageMarketing(role) && (
                      <Link href={`/admin/products/${p.id}/marketing`} className="text-brass-600 hover:underline">
                        Marketing
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canBulkEdit && selected.size > 0 && !selectAllMatching && allOnPageSelected && totalMatching > products.length && (
        <p className="mt-2 text-xs text-ink-500">
          All {products.length} products on this page are selected.{" "}
          <button type="button" className="text-brass-600 hover:underline" onClick={() => setSelectAllMatching(true)}>
            Select all {totalMatching} products matching the current filters
          </button>
        </p>
      )}

      {canBulkEdit && selectionCount > 0 && (
        <div className="sticky bottom-0 z-10 mt-3 flex items-center justify-between border border-ink bg-ink px-4 py-3 text-sm text-bone-100">
          <span>{selectionCount} product{selectionCount === 1 ? "" : "s"} selected</span>
          <div className="flex items-center gap-4">
            <button type="button" className="text-bone-300 hover:text-bone-100" onClick={clearSelection}>
              Clear
            </button>
            <a href={exportHref} className="border border-bone-100 px-4 py-1.5 hover:bg-bone-100 hover:text-ink">
              Export Selected
            </a>
            <button
              type="button"
              className="border border-bone-100 px-4 py-1.5 hover:bg-bone-100 hover:text-ink"
              onClick={() => setModalOpen(true)}
            >
              Bulk Edit
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <BulkEditModal
          selection={selection}
          selectionCount={selectionCount}
          categories={categories}
          themes={themes}
          onClose={() => setModalOpen(false)}
          onApplied={() => {
            setModalOpen(false);
            clearSelection();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
