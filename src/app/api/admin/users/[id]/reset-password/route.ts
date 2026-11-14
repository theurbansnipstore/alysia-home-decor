import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { USER_MANAGEMENT_ROLES } from "@/lib/admin/users-roles";
import { resetStaffPassword } from "@/lib/admin/user-service";
import { resetStaffPasswordSchema } from "@/lib/validations/admin-users";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(USER_MANAGEMENT_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = resetStaffPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await resetStaffPassword(params.id, parsed.data.newPassword);
    if (!result.ok) return apiError(result.error, result.status);

    return apiSuccess({ id: params.id, reset: true });
  } catch (err) {
    console.error("[POST /api/admin/users/[id]/reset-password]", err);
    return apiError("Failed to reset password", 500);
  }
}
