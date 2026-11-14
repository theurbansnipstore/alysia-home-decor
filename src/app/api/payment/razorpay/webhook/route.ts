import { NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/providers/payment/razorpay";
import { finalizeRazorpayPayment, handleRazorpayPaymentFailed } from "@/lib/checkout/razorpay-finalize";
import { handleRazorpayRefundWebhookEvent } from "@/lib/integrations/payment/razorpay-refund";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * Authoritative payment source (Module 11 design) — server-to-server,
 * independent of the customer's browser. No getSession()/cookies here by
 * design: Razorpay's signature over the raw body IS the authentication,
 * there is no user session in this request at all.
 *
 * Idempotency: delegated entirely to finalizeRazorpayPayment()'s
 * deterministic-Order.id primary-key guard — a redelivered webhook (Razorpay
 * explicitly does this; not an edge case) just gets `alreadyFinalized: true`
 * back and performs no further writes.
 */
export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[POST /api/payment/razorpay/webhook] failed to read body", err);
    return apiError("Invalid request body", 400);
  }

  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return apiError("Missing signature", 400);
  }

  let signatureValid: boolean;
  try {
    signatureValid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("[POST /api/payment/razorpay/webhook] verification error", err);
    return apiError("Webhook verification failed", 500);
  }
  if (!signatureValid) {
    console.error("[POST /api/payment/razorpay/webhook] invalid signature");
    return apiError("Invalid signature", 401);
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("[POST /api/payment/razorpay/webhook] invalid JSON body", err);
    return apiError("Invalid payload", 400);
  }

  try {
    if (event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (!razorpayOrderId || !razorpayPaymentId) {
        console.error("[webhook] payment.captured payload missing order_id/payment id", event);
        return apiSuccess({ received: true });
      }

      const result = await finalizeRazorpayPayment(razorpayOrderId, razorpayPaymentId);
      if (!result.success) {
        // Not fixable by Razorpay retrying (e.g. a genuine amount mismatch)
        // — acknowledge to stop retries, rely on the error already logged
        // inside finalizeRazorpayPayment for manual follow-up.
        console.error("[webhook] finalize did not succeed", razorpayOrderId, result.error);
      }
      return apiSuccess({ received: true });
    }

    if (event.event === "payment.failed") {
      // Attempt-first design: nothing durable was ever created for this
      // attempt, so there's no Order/Payment row to update — but the
      // customer (and relevant staff) can still be notified, recovering
      // who to notify from the attempt snapshot still on Razorpay's side.
      const razorpayOrderId = event.payload?.payment?.entity?.order_id;
      console.log("[webhook] payment.failed", razorpayOrderId);
      if (razorpayOrderId) {
        await handleRazorpayPaymentFailed(razorpayOrderId);
      }
      return apiSuccess({ received: true });
    }

    if (event.event === "refund.processed" || event.event === "refund.failed") {
      // Confirmed payload shape (razorpay.com/docs/webhooks/payloads/refunds/,
      // fetched directly this module — not guessed): payload.refund.entity
      // carries id/payment_id/amount/status; payload.payment.entity is also
      // present but unused here since Payment is looked up by razorpayPaymentId.
      const refundEntity = event.payload?.refund?.entity;
      if (!refundEntity?.id || !refundEntity.payment_id || refundEntity.amount === undefined) {
        console.error("[webhook] refund event payload missing required fields", event.event);
        return apiSuccess({ received: true });
      }
      const result = await handleRazorpayRefundWebhookEvent({
        razorpayPaymentId: refundEntity.payment_id,
        razorpayRefundId: refundEntity.id,
        status: event.event === "refund.processed" ? "processed" : "failed",
        amountPaise: refundEntity.amount,
      });
      if (!result.handled) {
        console.error("[webhook] refund event not handled", result.reason);
      }
      return apiSuccess({ received: true });
    }

    // Any other subscribed/unsubscribed event type — acknowledge, not an error.
    return apiSuccess({ received: true });
  } catch (err) {
    console.error("[POST /api/payment/razorpay/webhook] processing error", err);
    return apiError("Webhook processing failed", 500);
  }
}
