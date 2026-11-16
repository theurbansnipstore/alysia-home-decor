// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { pageUpdateSchema } from "@/lib/validations/page";
import { isPageSlugAvailable } from "@/lib/content/reserved-slugs";
import { logActivity } from "@/lib/admin/activity-log";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const page = await prisma.page.findUnique({ where: { id: params.id } });
    if (!page) return apiError("Page not found", 404);
    return apiSuccess(page);
  } catch (err) {
    console.error("[GET /api/admin/pages/[id]]", err);
    return apiError("Failed to load page", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.page.findUnique({ where: { id: params.id } });
    if (!existing) return apiError("Page not found", 404);

    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = pageUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid page data", 400, parsed.error.flatten().fieldErrors);
    const data = parsed.data;

    if (data.slug !== undefined && data.slug !== existing.slug) {
      const slugAvailable = await isPageSlugAvailable(data.slug, existing.id);
      if (!slugAvailable) return apiError("This slug is unavailable or already in use.", 409, { slug: ["Slug already in use."] });
    }

    const nextStatus = data.status ?? existing.status;
    // publishedAt is set the FIRST time a page transitions to PUBLISHED and
    // never overwritten by a later re-save while still published — it
    // records original publish date, not last-edited date (that's
    // updatedAt, already tracked separately by @updatedAt).
    const publishedAt =
      nextStatus === "PUBLISHED" && existing.status !== "PUBLISHED" ? new Date() : existing.publishedAt;

    const page = await prisma.$transaction(async (tx) => {
      const updated = await tx.page.update({
        where: { id: existing.id },
        data: {
          title: data.title ?? undefined,
          slug: data.slug ?? undefined,
          content: data.content ?? undefined,
          excerpt: data.excerpt !== undefined ? data.excerpt : undefined,
          status: data.status ?? undefined,
          seoTitle: data.seoTitle !== undefined ? data.seoTitle : undefined,
          seoDesc: data.seoDesc !== undefined ? data.seoDesc : undefined,
          publishedAt,
        },
      });

      const statusChanged = existing.status !== updated.status;
      await logActivity(tx, {
        userId: auth.session.id,
        action: statusChanged ? (updated.status === "PUBLISHED" ? "page.published" : "page.unpublished") : "page.updated",
        entity: "Page",
        entityId: updated.id,
        metadata: {
          action: statusChanged ? (updated.status === "PUBLISHED" ? "PUBLISH" : "UNPUBLISH") : "UPDATE",
          pageTitle: updated.title,
          slug: updated.slug,
          previousStatus: existing.status,
          newStatus: updated.status,
        },
      });

      return updated;
    });

    return apiSuccess(page);
  } catch (err) {
    console.error("[PATCH /api/admin/pages/[id]]", err);
    return apiError("Failed to update page", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.page.findUnique({ where: { id: params.id } });
    if (!existing) return apiError("Page not found", 404);

    // No other model references Page (no FK anywhere), so a plain delete
    // is always safe — unlike Product/Category, there is no "in use
    // elsewhere" case to guard against.
    await prisma.$transaction(async (tx) => {
      await tx.page.delete({ where: { id: existing.id } });
      await logActivity(tx, {
        userId: auth.session.id,
        action: "page.deleted",
        entity: "Page",
        entityId: existing.id,
        metadata: { action: "DELETE", pageTitle: existing.title, slug: existing.slug, previousStatus: existing.status },
      });
    });

    return apiSuccess({ id: existing.id });
  } catch (err) {
    console.error("[DELETE /api/admin/pages/[id]]", err);
    return apiError("Failed to delete page", 500);
  }
}
