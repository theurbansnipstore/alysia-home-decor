// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Not authenticated", 401);
    }

    // Fetched fresh from the DB rather than trusting the JWT payload's
    // name/email — those can go stale between token issuance and a
    // later profile edit. `select` is an explicit allowlist, not an
    // omit-after-fetch, so passwordHash can never accidentally leak here.
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      // Edge case: the account was deleted after the token was issued.
      return apiError("Not authenticated", 401);
    }

    return apiSuccess({ user });
  } catch (err) {
    console.error("[GET /api/auth/me]", err);
    return apiError("Failed to load account", 500);
  }
}
