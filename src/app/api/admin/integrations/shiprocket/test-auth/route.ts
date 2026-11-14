import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/admin/api-auth";
import { INTEGRATION_AREA_ROLES } from "@/lib/admin/integration-roles";
import { testShiprocketAuthentication } from "@/lib/integrations/shipping/shiprocket-provider";
import { logActivity } from "@/lib/admin/activity-log";
import { apiSuccess } from "@/lib/api-response";

/**
 * Safe authentication-only test (Module 29 Part 5/6) — never creates a
 * shipment. Result recorded via the existing ActivityLog, same pattern as
 * the Razorpay credential check.
 */
export async function POST() {
  const auth = await requireApiRole(INTEGRATION_AREA_ROLES);
  if (!auth.ok) return auth.response;

  const result = await testShiprocketAuthentication();

  try {
    await logActivity(prisma, {
      userId: auth.session.id,
      action: "integration.test",
      entity: "Integration",
      entityId: "shiprocket",
      metadata: {
        integration: "shiprocket",
        action: "test_authentication",
        result: result.ok ? "success" : "failure",
        detail: result.detail,
      },
    });
  } catch (err) {
    console.error("[POST /api/admin/integrations/shiprocket/test-auth] failed to write ActivityLog", err);
  }

  return apiSuccess({ ok: result.ok, detail: result.detail });
}
