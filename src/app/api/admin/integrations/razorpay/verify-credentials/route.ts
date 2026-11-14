import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/admin/api-auth";
import { INTEGRATION_AREA_ROLES } from "@/lib/admin/integration-roles";
import { checkRazorpayCredentials } from "@/lib/integrations/payment/razorpay-health";
import { logActivity } from "@/lib/admin/activity-log";
import { apiSuccess } from "@/lib/api-response";

/**
 * Safe, read-only credential check (Module 29 Part 5/6) — never creates a
 * payment/order. Result is recorded via the existing ActivityLog (never a
 * new table, per Part 14) so the dashboard can show "last successful test."
 */
export async function POST() {
  const auth = await requireApiRole(INTEGRATION_AREA_ROLES);
  if (!auth.ok) return auth.response;

  const result = await checkRazorpayCredentials();

  try {
    await logActivity(prisma, {
      userId: auth.session.id,
      action: "integration.test",
      entity: "Integration",
      entityId: "razorpay_payment",
      metadata: {
        integration: "razorpay_payment",
        action: "verify_credentials",
        result: result.ok ? "success" : "failure",
        detail: result.detail,
      },
    });
  } catch (err) {
    console.error("[POST /api/admin/integrations/razorpay/verify-credentials] failed to write ActivityLog", err);
  }

  // The HTTP call itself succeeded either way — ok:false here means
  // "credentials rejected", which is information, not a server error.
  return apiSuccess({ ok: result.ok, detail: result.detail });
}
