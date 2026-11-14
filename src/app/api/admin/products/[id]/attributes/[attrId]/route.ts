import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { attributeUpdateSchema } from "@/lib/validations/product";

function isNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; attrId: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = attributeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid attribute data", 400, parsed.error.flatten().fieldErrors);
    }

    const attribute = await prisma.productAttribute.update({
      where: { id: params.attrId, productId: params.id },
      data: parsed.data,
    });

    return apiSuccess(attribute);
  } catch (err) {
    if (isNotFound(err)) return apiError("Attribute not found", 404);
    console.error("[PATCH /api/admin/products/[id]/attributes/[attrId]]", err);
    return apiError("Failed to update attribute", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; attrId: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    await prisma.productAttribute.delete({ where: { id: params.attrId, productId: params.id } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    if (isNotFound(err)) return apiError("Attribute not found", 404);
    console.error("[DELETE /api/admin/products/[id]/attributes/[attrId]]", err);
    return apiError("Failed to delete attribute", 500);
  }
}
