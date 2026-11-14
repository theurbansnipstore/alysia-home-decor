import "server-only";
import type { Prisma } from "@prisma/client";

/** The subset of ProductAttribute labels the bulk editor, CSV export, and
 *  CSV import all treat as "well-known" flat columns (Material, Color,
 *  Width, Height, Care Instructions) — everything else on a product's
 *  attribute list stays admin-free-form and untouched by these tools. */
export const WELL_KNOWN_ATTRIBUTE_LABELS = ["Material", "Color", "Width", "Height", "Care Instructions"] as const;
export type WellKnownAttributeLabel = (typeof WELL_KNOWN_ATTRIBUTE_LABELS)[number];

type TxOrClient = Prisma.TransactionClient;

/** Find-or-create by (productId, label) — used wherever a flat "Material"/
 *  "Color"/etc. value needs to land in the existing ProductAttribute table
 *  instead of a new column. Blank value removes the attribute rather than
 *  leaving an empty row. */
export async function upsertAttribute(tx: TxOrClient, productId: string, label: string, value: string): Promise<void> {
  const existing = await tx.productAttribute.findFirst({ where: { productId, label } });

  if (!value.trim()) {
    if (existing) await tx.productAttribute.delete({ where: { id: existing.id } });
    return;
  }

  if (existing) {
    await tx.productAttribute.update({ where: { id: existing.id }, data: { value } });
  } else {
    const last = await tx.productAttribute.findFirst({ where: { productId }, orderBy: { sortOrder: "desc" } });
    await tx.productAttribute.create({ data: { productId, label, value, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  }
}
