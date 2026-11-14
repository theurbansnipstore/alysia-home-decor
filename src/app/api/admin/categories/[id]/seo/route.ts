import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { categorySeoUpdateSchema } from "@/lib/validations/category";

/**
 * Reuses MARKETING_ADMIN_ROLES exactly (Module 10) — the same role set
 * that already governs product SEO fields via
 * /api/admin/products/[id]/marketing. No new authorization mechanism.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(MARKETING_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.category.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return apiError("Category not found", 404);

    const body = await req.json();
    const parsed = categorySeoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid SEO data", 400, parsed.error.flatten().fieldErrors);
    }

    const category = await prisma.category.update({ where: { id: params.id }, data: parsed.data });
    return apiSuccess({ id: category.id });
  } catch (err) {
    console.error("[PATCH /api/admin/categories/[id]/seo]", err);
    return apiError("Failed to update category SEO fields", 500);
  }
}
