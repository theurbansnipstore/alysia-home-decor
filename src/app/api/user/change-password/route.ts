import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Not authenticated", 401);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError("Invalid request body", 400);
    }

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return apiError("Not authenticated", 401);
    }

    const isCurrentPasswordValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return apiError("Current password is incorrect", 401);
    }

    const newPasswordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Note: this doesn't invalidate other active sessions for this user —
    // there's no server-side session revocation list in the current
    // stateless-JWT design. Acceptable for Module 3's scope; worth
    // revisiting if/when a session store is introduced later.
    return apiSuccess({ message: "Password updated successfully" });
  } catch (err) {
    console.error("[POST /api/user/change-password]", err);
    return apiError("Failed to change password. Please try again.", 500);
  }
}
