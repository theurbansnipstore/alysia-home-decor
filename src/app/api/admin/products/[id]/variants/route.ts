import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { variantCreateSchema } from "@/lib/validations/product";

/**
 * Catalog/admin data only — Module 10 does not wire ProductVariant into
 * CartItem/OrderItem, so nothing created here is purchasable yet.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return apiError("Product not found", 404);

    const body = await req.json();
    const parsed = variantCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid variant data", 400, parsed.error.flatten().fieldErrors);
    }

    const skuTaken = await prisma.productVariant.findUnique({ where: { sku: parsed.data.sku }, select: { id: true } });
    if (skuTaken) return apiError("A variant with this SKU already exists.", 409, { sku: ["SKU already in use."] });

    const variant = await prisma.productVariant.create({
      data: { productId: params.id, ...parsed.data },
    });

    return apiSuccess(variant, 201);
  } catch (err) {
    console.error("[POST /api/admin/products/[id]/variants]", err);
    return apiError("Failed to create variant", 500);
  }
}
