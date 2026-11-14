import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { pageCreateSchema } from "@/lib/validations/page";
import { isPageSlugAvailable } from "@/lib/content/reserved-slugs";
import { logActivity } from "@/lib/admin/activity-log";

export async function GET() {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const pages = await prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, title: true, status: true, updatedAt: true, publishedAt: true },
    });
    return apiSuccess(pages);
  } catch (err) {
    console.error("[GET /api/admin/pages]", err);
    return apiError("Failed to load pages", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = pageCreateSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid page data", 400, parsed.error.flatten().fieldErrors);
    const data = parsed.data;

    const slugAvailable = await isPageSlugAvailable(data.slug);
    if (!slugAvailable) return apiError("This slug is unavailable or already in use.", 409, { slug: ["Slug already in use."] });

    const status = data.status ?? "DRAFT";
    const page = await prisma.$transaction(async (tx) => {
      const created = await tx.page.create({
        data: {
          title: data.title,
          slug: data.slug,
          content: data.content,
          excerpt: data.excerpt ?? null,
          status,
          seoTitle: data.seoTitle ?? null,
          seoDesc: data.seoDesc ?? null,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        },
      });

      await logActivity(tx, {
        userId: auth.session.id,
        action: "page.created",
        entity: "Page",
        entityId: created.id,
        metadata: { action: "CREATE", pageTitle: created.title, slug: created.slug, newStatus: created.status },
      });

      return created;
    });

    return apiSuccess({ id: page.id, slug: page.slug }, 201);
  } catch (err) {
    console.error("[POST /api/admin/pages]", err);
    return apiError("Failed to create page", 500);
  }
}
