import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { USER_MANAGEMENT_ROLES } from "@/lib/admin/users-roles";
import { setStaffBlocked } from "@/lib/admin/user-service";
import { setStaffBlockedSchema } from "@/lib/validations/admin-users";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(USER_MANAGEMENT_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = setStaffBlockedSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await setStaffBlocked(params.id, parsed.data.isBlocked);
    if (!result.ok) return apiError(result.error, result.status);

    return apiSuccess({ id: params.id, isBlocked: parsed.data.isBlocked });
  } catch (err) {
    console.error("[PATCH /api/admin/users/[id]/status]", err);
    return apiError("Failed to update status", 500);
  }
}
