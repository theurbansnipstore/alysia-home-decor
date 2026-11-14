import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiError } from "@/lib/api-response";
import type { Role } from "@prisma/client";
import type { SessionUser } from "@/types/auth";

type ApiAuthResult = { ok: true; session: SessionUser } | { ok: false; response: NextResponse };

/**
 * API-route auth check. Deliberately does NOT use requireSession()/requireRole()
 * from src/lib/session.ts — those call redirect(), which is wrong for a JSON
 * API. Uses the same underlying getSession() but returns 401/403 responses.
 */
export async function requireApiRole(allowedRoles: Role[]): Promise<ApiAuthResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: apiError("Authentication required.", 401) };
  }
  if (!allowedRoles.includes(session.role)) {
    return { ok: false, response: apiError("You do not have permission to perform this action.", 403) };
  }
  return { ok: true, session };
}
