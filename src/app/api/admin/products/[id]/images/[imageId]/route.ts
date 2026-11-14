import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { imageUpdateSchema } from "@/lib/validations/product";
import { getStorageProvider } from "@/lib/storage";

function isNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; imageId: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = imageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid image data", 400, parsed.error.flatten().fieldErrors);
    }

    const image = await prisma.productImage.update({
      where: { id: params.imageId, productId: params.id },
      data: parsed.data,
    });

    return apiSuccess(image);
  } catch (err) {
    if (isNotFound(err)) return apiError("Image not found", 404);
    console.error("[PATCH /api/admin/products/[id]/images/[imageId]]", err);
    return apiError("Failed to update image", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; imageId: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const deleted = await prisma.productImage.delete({ where: { id: params.imageId, productId: params.id } });
    if (deleted.storageKey) {
      await getStorageProvider().remove(deleted.storageKey);
    }
    return apiSuccess({ deleted: true });
  } catch (err) {
    if (isNotFound(err)) return apiError("Image not found", 404);
    console.error("[DELETE /api/admin/products/[id]/images/[imageId]]", err);
    return apiError("Failed to delete image", 500);
  }
}
