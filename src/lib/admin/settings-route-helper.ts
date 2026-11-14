import "server-only";
import { NextRequest } from "next/server";
import type { ZodType } from "zod";
import type { Role } from "@prisma/client";
import { requireApiRole } from "@/lib/admin/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * Every store_* settings PATCH route is identical except for its schema,
 * setter, and role list — this factory is the one place that pattern is
 * written, so every domain route file stays a thin, honest declaration
 * rather than duplicating the same auth/validate/save/error-handling
 * block 17 times.
 */
export function handleSettingsPatch<T>(schema: ZodType<T>, setter: (value: T) => Promise<void>, roles: Role[]) {
  return async function PATCH(req: NextRequest) {
    const auth = await requireApiRole(roles);
    if (!auth.ok) return auth.response;

    try {
      const body = await req.json().catch(() => null);
      if (!body) return apiError("Invalid request body", 400);

      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
      }

      await setter(parsed.data);
      return apiSuccess(parsed.data);
    } catch (err) {
      console.error("[settings PATCH]", err);
      return apiError("Failed to save settings", 500);
    }
  };
}
