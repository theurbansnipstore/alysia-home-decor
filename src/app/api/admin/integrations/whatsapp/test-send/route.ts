import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/admin/api-auth";
import { INTEGRATION_AREA_ROLES } from "@/lib/admin/integration-roles";
import { getWhatsAppProvider } from "@/lib/services/notifications/providers";
import { logActivity } from "@/lib/admin/activity-log";
import { apiSuccess, apiError } from "@/lib/api-response";

const testSendSchema = z.object({ to: z.string().min(6, "Enter a phone number.") });

/**
 * Explicit admin test action (Module 29 Part 6) — mirrors the email test
 * route exactly. No default destination (session has no phone number), so
 * the admin must type one; masked in the console provider's own log line
 * (providers/whatsapp.ts's maskPhone), plain here only because it's the
 * admin's own deliberate input, not a customer's data.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(INTEGRATION_AREA_ROLES);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = testSendSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid destination phone number.", 400);

  const to = parsed.data.to;
  const isRealProviderConfigured = (process.env.WHATSAPP_PROVIDER || "console") !== "console";

  let result: { ok: boolean; detail: string };
  try {
    const provider = getWhatsAppProvider();
    await provider.send({
      channel: "whatsapp",
      template: "integration_test",
      to: { phone: to },
      data: { triggeredBy: auth.session.name || auth.session.email, channel: "whatsapp" },
    });
    result = {
      ok: true,
      detail: isRealProviderConfigured
        ? "Sent via the configured provider."
        : "Printed to the server console — WHATSAPP_PROVIDER is \"console\", so no real WhatsApp message was sent.",
    };
  } catch (err) {
    console.error("[POST /api/admin/integrations/whatsapp/test-send]", err);
    result = { ok: false, detail: err instanceof Error ? err.message : "Unknown error." };
  }

  try {
    await logActivity(prisma, {
      userId: auth.session.id,
      action: "integration.test",
      entity: "Integration",
      entityId: "whatsapp",
      metadata: { integration: "whatsapp", action: "test_send", result: result.ok ? "success" : "failure", detail: result.detail, destination: to },
    });
  } catch (err) {
    console.error("[POST /api/admin/integrations/whatsapp/test-send] failed to write ActivityLog", err);
  }

  return apiSuccess({ ok: result.ok, detail: result.detail, isRealProviderConfigured });
}
