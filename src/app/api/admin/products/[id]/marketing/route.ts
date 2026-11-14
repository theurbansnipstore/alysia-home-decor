import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { marketingUpdateSchema } from "@/lib/validations/product";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(MARKETING_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return apiError("Product not found", 404);

    const body = await req.json();
    const parsed = marketingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid marketing data", 400, parsed.error.flatten().fieldErrors);
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return apiSuccess({ id: product.id });
  } catch (err) {
    console.error("[PATCH /api/admin/products/[id]/marketing]", err);
    return apiError("Failed to update marketing fields", 500);
  }
}
