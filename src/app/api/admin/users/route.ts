// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { USER_MANAGEMENT_ROLES } from "@/lib/admin/users-roles";
import { getAdminStaffList } from "@/lib/data/admin-users";
import { createStaffUser } from "@/lib/admin/user-service";
import { createStaffUserSchema } from "@/lib/validations/admin-users";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  const auth = await requireApiRole(USER_MANAGEMENT_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const staff = await getAdminStaffList();
    return apiSuccess({ staff });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return apiError("Failed to load staff users", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(USER_MANAGEMENT_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = createStaffUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await createStaffUser(parsed.data);
    if (!result.ok) return apiError(result.error, result.status);

    return apiSuccess(result.data, 201);
  } catch (err) {
    console.error("[POST /api/admin/users]", err);
    return apiError("Failed to create staff user", 500);
  }
}
