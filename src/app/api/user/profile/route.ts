import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { updateProfileSchema } from "@/lib/validations/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Not authenticated", 401);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError("Invalid request body", 400);
    }

    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    // Email is not editable through this endpoint on purpose — changing it
    // would need re-verification, and email verification is explicitly
    // out of scope for Module 3.
    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
      },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    return apiSuccess({ user });
  } catch (err) {
    console.error("[PATCH /api/user/profile]", err);
    return apiError("Failed to update profile. Please try again.", 500);
  }
}
