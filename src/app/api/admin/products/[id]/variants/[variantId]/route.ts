import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { variantUpdateSchema } from "@/lib/validations/product";

function isNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}
function isUniqueConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; variantId: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = variantUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid variant data", 400, parsed.error.flatten().fieldErrors);
    }

    const variant = await prisma.productVariant.update({
      where: { id: params.variantId, productId: params.id },
      data: parsed.data,
    });

    return apiSuccess(variant);
  } catch (err) {
    if (isNotFound(err)) return apiError("Variant not found", 404);
    if (isUniqueConflict(err)) return apiError("A variant with this SKU already exists.", 409);
    console.error("[PATCH /api/admin/products/[id]/variants/[variantId]]", err);
    return apiError("Failed to update variant", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; variantId: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    await prisma.productVariant.delete({ where: { id: params.variantId, productId: params.id } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    if (isNotFound(err)) return apiError("Variant not found", 404);
    console.error("[DELETE /api/admin/products/[id]/variants/[variantId]]", err);
    return apiError("Failed to delete variant", 500);
  }
}
