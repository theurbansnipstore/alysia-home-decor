// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { apiSuccess, apiError } from "@/lib/api-response";
import { findMediaUsages } from "@/lib/settings/media-usage";

/** Module 38 Part 2 — lets the Media admin screen check "is this image
 *  referenced elsewhere" before a delete, so it can require deliberate
 *  confirmation instead of silently removing something in active use. */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return apiError("Missing url query parameter.", 400);

  const usages = await findMediaUsages(url);
  return apiSuccess({ usages });
}
