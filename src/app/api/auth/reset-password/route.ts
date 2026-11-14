import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { resetPasswordWithToken } from "@/lib/auth/password-reset";
import { apiSuccess, apiError } from "@/lib/api-response";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "This reset link is invalid.",
  EXPIRED_TOKEN: "This reset link has expired. Please request a new one.",
  USED_TOKEN: "This reset link has already been used.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Please check the form and try again.", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await resetPasswordWithToken(parsed.data.token, parsed.data.newPassword);
    if (!result.success) {
      return apiError(ERROR_MESSAGES[result.error!] ?? "This reset link could not be used.", 400);
    }

    return apiSuccess({ message: "Your password has been reset. Please sign in with your new password." });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
