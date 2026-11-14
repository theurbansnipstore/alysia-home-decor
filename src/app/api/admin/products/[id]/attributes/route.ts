import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { attributeCreateSchema, attributeReorderSchema } from "@/lib/validations/product";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return apiError("Product not found", 404);

    const body = await req.json();
    const parsed = attributeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid attribute data", 400, parsed.error.flatten().fieldErrors);
    }

    let sortOrder = parsed.data.sortOrder;
    if (sortOrder === undefined) {
      const last = await prisma.productAttribute.findFirst({
        where: { productId: params.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const attribute = await prisma.productAttribute.create({
      data: { productId: params.id, ...parsed.data, sortOrder },
    });

    return apiSuccess(attribute, 201);
  } catch (err) {
    console.error("[POST /api/admin/products/[id]/attributes]", err);
    return apiError("Failed to create attribute", 500);
  }
}

/** Bulk reorder — accepts the full ordered list of {id, sortOrder}. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = attributeReorderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid reorder data", 400, parsed.error.flatten().fieldErrors);
    }

    await prisma.$transaction(
      parsed.data.order.map(({ id, sortOrder }) =>
        prisma.productAttribute.update({
          where: { id, productId: params.id },
          data: { sortOrder },
        })
      )
    );

    return apiSuccess({ updated: parsed.data.order.length });
  } catch (err) {
    console.error("[PATCH /api/admin/products/[id]/attributes]", err);
    return apiError("Failed to reorder attributes", 500);
  }
}
