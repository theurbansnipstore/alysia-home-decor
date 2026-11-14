"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { slugify } from "@/lib/utils";
import type { CategoryDTO, ThemeDTO } from "@/types";
import type { ProductStatus } from "@prisma/client";

export interface ProductFormInitial {
  name: string;
  slug: string;
  description: string;
  price: string;
  discountPrice: string | null;
  sku: string;
  barcode: string | null;
  brand: string | null;
  weightGrams: number | null;
  dimensions: string | null;
  tags: string | null;
  status: ProductStatus;
  categoryId: string;
  themeId: string | null;
  lowStockAt: number;
  returnPolicyOverride: string | null;
  stockAvailable?: number;
  /** Shortcuts over the well-known ProductAttribute rows (Material, Color,
   *  Width, Height, Care Instructions) — same rows the Attributes panel
   *  below and CSV import/export already read/write; edit either place and
   *  the other stays in sync since both target the same underlying row. */
  material?: string;
  color?: string;
  width?: string;
  height?: string;
  careInstructions?: string;
}

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initial?: ProductFormInitial;
  categories: CategoryDTO[];
  themes: ThemeDTO[];
}

const EMPTY: ProductFormInitial = {
  name: "",
  slug: "",
  description: "",
  price: "",
  discountPrice: "",
  sku: "",
  barcode: "",
  brand: "",
  weightGrams: null,
  dimensions: "",
  tags: "",
  status: "DRAFT",
  categoryId: "",
  themeId: "",
  lowStockAt: 5,
  returnPolicyOverride: "",
  stockAvailable: 0,
  material: "",
  color: "",
  width: "",
  height: "",
  careInstructions: "",
};

export default function ProductForm({ mode, productId, initial, categories, themes }: ProductFormProps) {
  const router = useRouter();
  const base = initial ?? EMPTY;

  const [name, setName] = useState(base.name);
  const [slug, setSlug] = useState(base.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(base.description);
  const [price, setPrice] = useState(base.price);
  const [discountPrice, setDiscountPrice] = useState(base.discountPrice ?? "");
  const [sku, setSku] = useState(base.sku);
  const [barcode, setBarcode] = useState(base.barcode ?? "");
  const [brand, setBrand] = useState(base.brand ?? "");
  const [weightGrams, setWeightGrams] = useState(base.weightGrams != null ? String(base.weightGrams) : "");
  const [dimensions, setDimensions] = useState(base.dimensions ?? "");
  const [tags, setTags] = useState(base.tags ?? "");
  const [status, setStatus] = useState<ProductStatus>(base.status);
  const [categoryId, setCategoryId] = useState(base.categoryId);
  const [themeId, setThemeId] = useState(base.themeId ?? "");
  const [lowStockAt, setLowStockAt] = useState(String(base.lowStockAt));
  const [stockAvailable, setStockAvailable] = useState(String(base.stockAvailable ?? 0));
  const [returnPolicyOverride, setReturnPolicyOverride] = useState(base.returnPolicyOverride ?? "");
  const [material, setMaterial] = useState(base.material ?? "");
  const [color, setColor] = useState(base.color ?? "");
  const [width, setWidth] = useState(base.width ?? "");
  const [height, setHeight] = useState(base.height ?? "");
  const [careInstructions, setCareInstructions] = useState(base.careInstructions ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const payload = {
      name,
      slug,
      description,
      price,
      discountPrice: discountPrice || null,
      sku,
      barcode: barcode || null,
      brand: brand || null,
      weightGrams: weightGrams ? parseInt(weightGrams, 10) : null,
      dimensions: dimensions || null,
      tags: tags || null,
      status,
      categoryId,
      themeId: themeId || null,
      lowStockAt: parseInt(lowStockAt, 10) || 0,
      returnPolicyOverride: returnPolicyOverride || null,
      ...(mode === "create" ? { stockAvailable: parseInt(stockAvailable, 10) || 0 } : {}),
      material,
      color,
      width,
      height,
      careInstructions,
    };

    try {
      const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save this product.");
        if (json.details) setFieldErrors(json.details);
        return;
      }

      if (mode === "create") {
        router.push(`/admin/products/${json.data.id}`);
        router.refresh();
      } else {
        setSuccess("Saved.");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border border-ink-100 bg-bone p-5">
      {error && (
        <p role="alert" className="border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">
          {error}
        </p>
      )}
      {success && <p className="border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">{success}</p>}

      <section>
        <h2 className="mb-3 font-display text-base text-ink">Basic Info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" error={fieldErrors.name}>
            <input required value={name} onChange={(e) => handleNameChange(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Slug" error={fieldErrors.slug}>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className={inputCls}
            />
            {mode === "edit" && slug !== base.slug && (
              <p className="mt-1 text-xs text-ink-500">
                Changing the URL will preserve the previous URL with a permanent redirect.
              </p>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" error={fieldErrors.description}>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-base text-ink">Pricing & Inventory</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Price (₹)" error={fieldErrors.price}>
            <input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Discount Price (₹)" error={fieldErrors.discountPrice}>
            <input type="number" min="0" step="0.01" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label="SKU" error={fieldErrors.sku}>
            <input required value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Barcode" error={fieldErrors.barcode}>
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Brand" error={fieldErrors.brand}>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Weight (grams)" error={fieldErrors.weightGrams}>
            <input type="number" min="0" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Dimensions" error={fieldErrors.dimensions}>
            <input placeholder="L x W x H cm" value={dimensions} onChange={(e) => setDimensions(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tags (comma-separated)" error={fieldErrors.tags}>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Low-stock threshold" error={fieldErrors.lowStockAt}>
            <input type="number" min="0" value={lowStockAt} onChange={(e) => setLowStockAt(e.target.value)} className={inputCls} />
          </Field>
          {mode === "create" && (
            <Field label="Initial stock quantity">
              <input type="number" min="0" value={stockAvailable} onChange={(e) => setStockAvailable(e.target.value)} className={inputCls} />
            </Field>
          )}
        </div>
        {mode === "edit" && (
          <p className="mt-2 text-xs text-ink-500">
            Stock changes after creation go through the Stock panel below, so every change is recorded in the movement history.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-base text-ink">Organization</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Category" error={fieldErrors.categoryId}>
            <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Theme">
            <select value={themeId} onChange={(e) => setThemeId(e.target.value)} className={inputCls}>
              <option value="">None</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className={inputCls}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-base text-ink">Product Details</h2>
        <p className="mb-3 text-xs text-ink-500">
          These map to the Material/Color/Width/Height/Care Instructions rows in Attributes below — editing either place keeps
          the other in sync.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Material" error={fieldErrors.material}>
            <input value={material} onChange={(e) => setMaterial(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Color" error={fieldErrors.color}>
            <input value={color} onChange={(e) => setColor(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Width" error={fieldErrors.width}>
            <input placeholder="e.g. 45 cm" value={width} onChange={(e) => setWidth(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Height" error={fieldErrors.height}>
            <input placeholder="e.g. 60 cm" value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Care Instructions" error={fieldErrors.careInstructions}>
              <textarea rows={2} value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-base text-ink">Return &amp; Exchanges (this product only)</h2>
        <Field label="Override — leave blank to use the site's default Returns &amp; Exchanges copy">
          <textarea
            rows={3}
            value={returnPolicyOverride}
            onChange={(e) => setReturnPolicyOverride(e.target.value)}
            className={inputCls}
          />
        </Field>
      </section>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

const inputCls = "w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none";

function Field({ label, error, children }: { label: string; error?: string[]; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-ink-700">{label}</label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-clay">
          {error[0]}
        </p>
      )}
    </div>
  );
}
