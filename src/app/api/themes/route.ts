// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { getAllThemes } from "@/lib/data/themes";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const themes = await getAllThemes();
    return apiSuccess({ themes });
  } catch (err) {
    console.error("[GET /api/themes]", err);
    return apiError("Failed to load themes", 500);
  }
}
