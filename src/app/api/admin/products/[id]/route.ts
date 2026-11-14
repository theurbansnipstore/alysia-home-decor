import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { PRODUCT_AREA_ROLES, FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { getAdminProductById } from "@/lib/data/admin-products";
import { productUpdateSchema, productDetailAttributesSchema } from "@/lib/validations/product";
import { WELL_KNOWN_ATTRIBUTE_LABELS, upsertAttribute } from "@/lib/admin/product-attributes";
import { logActivity } from "@/lib/admin/activity-log";
import { isSlugAvailable, recordSlugChange } from "@/lib/products/slug-redirects";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(PRODUCT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const product = await getAdminProductById(params.id);
    if (!product) return apiError("Product not found", 404);
    return apiSuccess(product);
  } catch (err) {
    console.error("[GET /api/admin/products/[id]]", err);
    return apiError("Failed to load product", 500);
  }
}

/** Short, scalar business fields only — never `description` (large text; tracked in changedFields, never duplicated into before/after). Mirrors exactly the fields productUpdateSchema allows changing. */
const COMPARABLE_FIELDS = [
  "name",
  "slug",
  "sku",
  "price",
  "discountPrice",
  "barcode",
  "brand",
  "weightGrams",
  "dimensions",
  "tags",
  "status",
  "categoryId",
  "themeId",
  "lowStockAt",
  "returnPolicyOverride",
] as const;

type ComparableValue = string | number | boolean | null;

function normalize(v: unknown): ComparableValue {
  if (v === null || v === undefined) return null;
  // Decimal fields (price/discountPrice) — compare/display as strings, matching how the rest of the codebase serializes Decimal.
  if (typeof v === "object" && "toString" in v) return (v as { toString(): string }).toString();
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}

/** A Decimal's toString() ("999.00") and a plain form-submitted numeric
 *  string ("999") represent the same value but aren't string-equal — this
 *  compares numerically whenever both sides parse as numbers, so an
 *  unchanged price never false-positives as "changed" purely from
 *  formatting. Non-numeric fields (name, status, etc.) fall back to exact
 *  equality, which is correct for them. */
function valuesEqual(a: ComparableValue, b: ComparableValue): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && String(a).trim() !== "" && String(b).trim() !== "") {
    return numA === numB;
  }
  return false;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sku: true,
        price: true,
        discountPrice: true,
        barcode: true,
        brand: true,
        weightGrams: true,
        dimensions: true,
        tags: true,
        status: true,
        categoryId: true,
        themeId: true,
        lowStockAt: true,
        returnPolicyOverride: true,
        attributes: { where: { label: { in: [...WELL_KNOWN_ATTRIBUTE_LABELS] } }, select: { label: true, value: true } },
      },
    });
    if (!existing) return apiError("Product not found", 404);

    const body = await req.json();
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid product data", 400, parsed.error.flatten().fieldErrors);
    }
    const data = parsed.data;

    if (data.slug && data.slug !== existing.slug) {
      // Checks both live product slugs and historical redirect slugs
      // (Module 32) — allows this product to re-adopt one of its OWN past
      // slugs (recordSlugChange cleans up that stale row below), but never
      // a slug that's live or historical on a DIFFERENT product.
      const available = await isSlugAvailable(data.slug, params.id);
      if (!available) return apiError("A product with this slug already exists.", 409, { slug: ["Slug already in use."] });
    }
    if (data.sku) {
      const skuTaken = await prisma.product.findFirst({
        where: { sku: data.sku, id: { not: params.id } },
        select: { id: true },
      });
      if (skuTaken) return apiError("A product with this SKU already exists.", 409, { sku: ["SKU already in use."] });
    }

    // Module 34: proactive existence checks for the same reason as the
    // create route — without these, a nonexistent categoryId/themeId only
    // surfaces as a foreign-key violation caught by the generic catch
    // block below (a 500, not a clean 400). Only checked when this request
    // actually touches that field (a PATCH is partial).
    if (data.categoryId !== undefined) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
      if (!category) return apiError("Selected category does not exist.", 400, { categoryId: ["Category not found."] });
    }
    if (data.themeId) {
      const theme = await prisma.theme.findUnique({ where: { id: data.themeId }, select: { id: true } });
      if (!theme) return apiError("Selected theme does not exist.", 400, { themeId: ["Theme not found."] });
    }

    // Module 34: discountPrice is displayed as the actual selling price
    // (struck-through original alongside it), so it must stay below price —
    // productCreateSchema enforces this in one shot, but a PATCH can touch
    // only one of the two fields, so the check has to happen here against
    // the MERGED value (whichever of price/discountPrice wasn't sent in
    // this request keeps its current, already-valid stored value).
    if (data.price !== undefined || data.discountPrice !== undefined) {
      const effectivePrice = data.price !== undefined ? Number(data.price) : Number(existing.price);
      const effectiveDiscount = data.discountPrice !== undefined ? data.discountPrice : existing.discountPrice ? existing.discountPrice.toString() : null;
      if (effectiveDiscount !== null && Number(effectiveDiscount) >= effectivePrice) {
        return apiError("Discount price must be less than the regular price.", 400, { discountPrice: ["Must be less than the regular price."] });
      }
    }

    // Diff computed from the submitted payload vs. the pre-fetch above —
    // independent of whether the write below succeeds, so this never
    // guesses at values, only compares what was actually sent to what was
    // actually there a moment ago.
    const changedFields: string[] = [];
    const before: Record<string, ComparableValue> = {};
    const after: Record<string, ComparableValue> = {};
    for (const field of COMPARABLE_FIELDS) {
      if (data[field] === undefined) continue;
      const prev = normalize(existing[field]);
      const next = normalize(data[field]);
      if (!valuesEqual(prev, next)) {
        changedFields.push(field);
        before[field] = prev;
        after[field] = next;
      }
    }
    if (data.description !== undefined && data.description !== existing.description) {
      changedFields.push("description");
    }

    const attrs = productDetailAttributesSchema.safeParse(body);
    const attrByLabel = new Map(existing.attributes.map((a) => [a.label, a.value]));
    const ATTR_FIELD_TO_LABEL: Record<string, string> = {
      material: "Material",
      color: "Color",
      width: "Width",
      height: "Height",
      careInstructions: "Care Instructions",
    };
    if (attrs.success) {
      for (const [field, value] of Object.entries(attrs.data)) {
        if (value === undefined) continue;
        const label = ATTR_FIELD_TO_LABEL[field];
        const prev = attrByLabel.get(label) ?? "";
        if (prev !== value) {
          changedFields.push(`attributes.${field}`);
          before[`attributes.${field}`] = prev || null;
          after[`attributes.${field}`] = value || null;
        }
      }
    }

    // True no-op (Module 23 Part 10): nothing actually differs from what's
    // already stored — skip the audit entry rather than log a misleading
    // "updated" for a save that changed nothing.
    const hasChanges = changedFields.length > 0;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: params.id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.discountPrice !== undefined ? { discountPrice: data.discountPrice } : {}),
          ...(data.sku !== undefined ? { sku: data.sku } : {}),
          ...(data.barcode !== undefined ? { barcode: data.barcode } : {}),
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.weightGrams !== undefined ? { weightGrams: data.weightGrams } : {}),
          ...(data.dimensions !== undefined ? { dimensions: data.dimensions } : {}),
          ...(data.tags !== undefined ? { tags: data.tags } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          ...(data.themeId !== undefined ? { themeId: data.themeId } : {}),
          ...(data.lowStockAt !== undefined ? { lowStockAt: data.lowStockAt } : {}),
          ...(data.returnPolicyOverride !== undefined ? { returnPolicyOverride: data.returnPolicyOverride } : {}),
        },
      });

      // Same transaction as the slug write itself (Module 32 Part 21) — a
      // redirect can never exist without the slug change it belongs to
      // having actually committed, or vice versa.
      if (data.slug !== undefined && data.slug !== existing.slug) {
        await recordSlugChange(tx, params.id, existing.slug, data.slug);
      }

      // Same product-change-and-audit-entry-succeed-or-fail-together
      // guarantee as create (Module 23 Part 7).
      if (hasChanges) {
        await logActivity(tx, {
          userId: auth.session.id,
          action: "product.updated",
          entity: "Product",
          entityId: updated.id,
          metadata: { changedFields, before, after },
        });
      }

      return updated;
    });

    // Attribute writes stay their own pre-existing, separate transaction —
    // unchanged architecture; only the diff computation above (read-only)
    // needed the current attribute values, not this write step.
    if (attrs.success) {
      const d = attrs.data;
      await prisma.$transaction(async (tx) => {
        if (d.material !== undefined) await upsertAttribute(tx, params.id, WELL_KNOWN_ATTRIBUTE_LABELS[0], d.material);
        if (d.color !== undefined) await upsertAttribute(tx, params.id, WELL_KNOWN_ATTRIBUTE_LABELS[1], d.color);
        if (d.width !== undefined) await upsertAttribute(tx, params.id, WELL_KNOWN_ATTRIBUTE_LABELS[2], d.width);
        if (d.height !== undefined) await upsertAttribute(tx, params.id, WELL_KNOWN_ATTRIBUTE_LABELS[3], d.height);
        if (d.careInstructions !== undefined)
          await upsertAttribute(tx, params.id, WELL_KNOWN_ATTRIBUTE_LABELS[4], d.careInstructions);
      });
    }

    return apiSuccess({ id: product.id, slug: product.slug });
  } catch (err) {
    console.error("[PATCH /api/admin/products/[id]]", err);
    return apiError("Failed to update product", 500);
  }
}
