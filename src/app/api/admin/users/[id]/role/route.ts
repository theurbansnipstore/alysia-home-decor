import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { USER_MANAGEMENT_ROLES } from "@/lib/admin/users-roles";
import { assignUserRole } from "@/lib/admin/user-service";
import { assignRoleSchema } from "@/lib/validations/store-settings";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(USER_MANAGEMENT_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = assignRoleSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid role", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await assignUserRole(params.id, parsed.data.role);
    if (!result.ok) return apiError(result.error, result.status);

    return apiSuccess({ id: params.id, role: parsed.data.role });
  } catch (err) {
    console.error("[PATCH /api/admin/users/[id]/role]", err);
    return apiError("Failed to update role", 500);
  }
}
