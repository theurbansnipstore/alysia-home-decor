import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { apiSuccess, apiError } from "@/lib/api-response";

const GENERIC_MESSAGE = "If an account with that email exists, we'll send you a password reset link.";

// Email-scoped rate limit — the abuse case this guards against is
// email-bombing one victim's inbox with reset links, not general traffic.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Please enter a valid email address.", 400, parsed.error.flatten().fieldErrors);
    }

    // Rate limit is checked (and always applies) before ever looking at
    // whether the email is registered — an unknown email still consumes
    // the same rate-limit budget as a known one, so the response never
    // varies in a way that would reveal account existence.
    if (!checkRateLimit(`forgot-password:${parsed.data.email}`, RATE_LIMIT, RATE_WINDOW_MS)) {
      // Same generic message and status even when rate-limited — a
      // different response here would itself be a signal to an attacker.
      return apiSuccess({ message: GENERIC_MESSAGE });
    }

    await requestPasswordReset(parsed.data.email);

    return apiSuccess({ message: GENERIC_MESSAGE });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    // Even on an unexpected error, don't leak internals — but this one
    // genuine-failure case does return a distinct error rather than the
    // generic success message, since nothing was necessarily sent.
    return apiError("Something went wrong. Please try again.", 500);
  }
}
