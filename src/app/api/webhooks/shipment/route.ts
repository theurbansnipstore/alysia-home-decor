import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyShipmentWebhookSignature } from "@/lib/integrations/shipping/webhook-security";
import { processShipmentEvent } from "@/lib/integrations/shipping/shipment-service";
import { shipmentWebhookEventSchema } from "@/lib/validations/shipment-webhook";
import { ORDER_FULL_ACCESS_ROLES } from "@/lib/admin/order-roles";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * LOCAL MOCK shipment webhook receiver (Module 23) — not a real Shiprocket
 * webhook endpoint. It exercises the exact same downstream path a real one
 * would (signature verification → parse → processShipmentEvent() →
 * status-service.ts), but the envelope shape here is OUR OWN, invented for
 * local testing (see validations/shipment-webhook.ts's header comment), not
 * Shiprocket's real documented contract, which hasn't been confirmed.
 *
 * Server-to-server, no session/cookie (mirrors
 * /api/payment/razorpay/webhook exactly) — the HMAC signature over the raw
 * body IS the authentication. `actorUserId` inside the (signed) body is a
 * local-testing stand-in for the unresolved "who does a real automated
 * webhook attribute audit entries to" question (see the module report) —
 * still checked against real ORDER_FULL_ACCESS_ROLES below so a signed
 * payload can't attribute actions to an arbitrary/unprivileged user id.
 */
export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[POST /api/webhooks/shipment] failed to read body", err);
    return apiError("Invalid request body", 400);
  }

  const signature = req.headers.get("x-shipment-signature");
  if (!signature) {
    return apiError("Missing signature", 400);
  }

  let signatureValid: boolean;
  try {
    signatureValid = verifyShipmentWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("[POST /api/webhooks/shipment] verification error", err);
    return apiError("Webhook verification failed", 500);
  }
  if (!signatureValid) {
    console.error("[POST /api/webhooks/shipment] invalid signature");
    return apiError("Invalid signature", 401);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch (err) {
    console.error("[POST /api/webhooks/shipment] invalid JSON body", err);
    return apiError("Invalid payload", 400);
  }

  const parsed = shipmentWebhookEventSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[POST /api/webhooks/shipment] malformed payload", parsed.error.flatten().fieldErrors);
    return apiError("Malformed payload", 400);
  }

  const actor = await prisma.user.findUnique({ where: { id: parsed.data.actorUserId }, select: { role: true } });
  if (!actor || !ORDER_FULL_ACCESS_ROLES.includes(actor.role)) {
    console.error("[POST /api/webhooks/shipment] actorUserId is not a valid order-management staff account", parsed.data.actorUserId);
    return apiError("Invalid actor", 400);
  }

  try {
    const result = await processShipmentEvent(
      { trackingNumber: parsed.data.trackingNumber, status: parsed.data.status, occurredAt: new Date(parsed.data.occurredAt) },
      parsed.data.actorUserId
    );
    if (!result.handled) {
      // Same "acknowledge, don't retry-loop the provider" reasoning as the
      // Razorpay webhook route — an unresolvable event (unknown tracking
      // number, ambiguous match) isn't fixable by the provider redelivering it.
      console.error("[webhooks/shipment] event not handled", result.reason);
    }
    return apiSuccess({ received: true });
  } catch (err) {
    console.error("[POST /api/webhooks/shipment] processing error", err);
    return apiError("Webhook processing failed", 500);
  }
}
