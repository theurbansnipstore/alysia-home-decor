import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/admin/api-auth";
import { INTEGRATION_AREA_ROLES } from "@/lib/admin/integration-roles";
import { getEmailProvider } from "@/lib/services/notifications/providers";
import { logActivity } from "@/lib/admin/activity-log";
import { apiSuccess, apiError } from "@/lib/api-response";

const testSendSchema = z.object({ to: z.string().email().optional() });

/**
 * Explicit admin test action (Module 29 Part 6) — sends via
 * getEmailProvider(), the exact same factory real notifications use, so
 * this genuinely exercises the current configuration. Only "console" is
 * implemented today, so this always prints to the server log; it never
 * claims to have sent a real email (Part 6's explicit disclosure rule).
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(INTEGRATION_AREA_ROLES);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = testSendSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid destination email.", 400, parsed.error.flatten().fieldErrors);

  const to = parsed.data.to || auth.session.email;
  const isRealProviderConfigured = (process.env.EMAIL_PROVIDER || "console") !== "console";

  let result: { ok: boolean; detail: string };
  try {
    const provider = getEmailProvider();
    await provider.send({
      channel: "email",
      template: "integration_test",
      to: { email: to },
      data: { triggeredBy: auth.session.name || auth.session.email, channel: "email" },
    });
    result = {
      ok: true,
      detail: isRealProviderConfigured
        ? "Sent via the configured provider."
        : "Printed to the server console — EMAIL_PROVIDER is \"console\", so no real email was sent.",
    };
  } catch (err) {
    console.error("[POST /api/admin/integrations/email/test-send]", err);
    result = { ok: false, detail: err instanceof Error ? err.message : "Unknown error." };
  }

  try {
    await logActivity(prisma, {
      userId: auth.session.id,
      action: "integration.test",
      entity: "Integration",
      entityId: "email",
      metadata: { integration: "email", action: "test_send", result: result.ok ? "success" : "failure", detail: result.detail, destination: to },
    });
  } catch (err) {
    console.error("[POST /api/admin/integrations/email/test-send] failed to write ActivityLog", err);
  }

  return apiSuccess({ ok: result.ok, detail: result.detail, isRealProviderConfigured });
}
