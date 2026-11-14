import "server-only";
import { prisma } from "@/lib/prisma";
import type { Payment } from "@prisma/client";
import { logActivity } from "@/lib/admin/activity-log";
import { emit } from "@/lib/services/notifications";

/**
 * Real Razorpay refund service (Module 28). Deliberately bypasses the
 * installed `razorpay` SDK for the refund call specifically — confirmed by
 * reading node_modules/razorpay/dist/api.js directly that its `api.post()`
 * wrapper only ever sends a fixed header set (`X-Razorpay-Account`,
 * `Content-Type`) and has no per-request header override, so it cannot send
 * Razorpay's own `X-Refund-Idempotency` header. This file makes a direct,
 * `fetch`-based call instead, using the exact endpoint/auth/header contract
 * confirmed against Razorpay's official docs (razorpay.com/docs/api/refunds/
 * and razorpay.com/docs/api/refunds/create-normal/#idempotency, both fetched
 * and read directly this module — not inferred/guessed).
 *
 * Confirmed contract:
 *   POST https://api.razorpay.com/v1/payments/:id/refund
 *   Auth: HTTP Basic (key_id:key_secret) — same credential pair as every
 *         other Razorpay call in this codebase (razorpay-client.ts).
 *   Body: { amount?: number (paise), speed?, notes?, receipt? }
 *   Header for idempotency: X-Refund-Idempotency: <key>
 *     (key must be >=10 chars, alphanumeric + hyphen + underscore only —
 *     confirmed from the docs)
 *   Response: { id, entity:"refund", amount, currency, payment_id,
 *               status: "pending"|"processed"|"failed", speed_requested,
 *               speed_processed, created_at, ... }
 *
 * Per Razorpay's own documentation, `refund.processed` (and `refund.failed`)
 * WEBHOOK events are "the most reliable and recommended way to receive the
 * final status update" — this file's synchronous call applies whatever
 * status Razorpay returns immediately (good for fast admin UI feedback),
 * and the existing /api/payment/razorpay/webhook route (extended this
 * module, not duplicated) independently applies the same update when the
 * real webhook arrives — mirroring exactly how razorpay-finalize.ts already
 * handles the /verify-vs-webhook race for payment finalization.
 */

const RAZORPAY_REFUND_API_BASE = "https://api.razorpay.com/v1";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to your .env file to use Razorpay refunds.`);
  }
  return value;
}

/** Deterministic and stable across retries for the SAME logical refund attempt (same payment + same amount) — this is what makes a network-timeout-then-retry safe: the retry reuses the identical key, so Razorpay recognizes it as the same request rather than creating a second refund. A genuinely different amount (e.g. an admin correcting a prior failed attempt) naturally gets a different key, which is correct — that IS a different request. */
function buildIdempotencyKey(razorpayPaymentId: string, amountPaise: number): string {
  return `refund_${razorpayPaymentId}_${amountPaise}`;
}

export interface RazorpayRefundApiResult {
  id: string;
  amountPaise: number;
  status: "pending" | "processed" | "failed";
}

/** Raw HTTP call — isolated so its one job is exactly the confirmed contract above, nothing else. */
async function callRazorpayRefundApi(razorpayPaymentId: string, amountPaise: number, idempotencyKey: string): Promise<{ ok: true; result: RazorpayRefundApiResult } | { ok: false; httpStatus: number; conflict: boolean }> {
  const keyId = getEnv("RAZORPAY_KEY_ID");
  const keySecret = getEnv("RAZORPAY_KEY_SECRET");
  const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch(`${RAZORPAY_REFUND_API_BASE}/payments/${razorpayPaymentId}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
      "X-Refund-Idempotency": idempotencyKey,
    },
    body: JSON.stringify({ amount: amountPaise }),
  });

  if (res.status === 409) {
    // Per the confirmed idempotency docs: a request with the same key
    // arriving while a prior one is still being processed gets 409 — not a
    // failure, a "still in flight" signal. Never logged with request/response
    // bodies (could contain account-identifying data), only the status.
    return { ok: false, httpStatus: 409, conflict: true };
  }
  if (!res.ok) {
    return { ok: false, httpStatus: res.status, conflict: false };
  }

  const json = (await res.json()) as { id: string; amount: number; status: "pending" | "processed" | "failed" };
  return { ok: true, result: { id: json.id, amountPaise: json.amount, status: json.status } };
}

export interface RefundEligibility {
  eligible: boolean;
  reason?: string;
  maxRefundableAmount?: number;
}

/** Server-side source of truth — the admin UI mirrors this only to decide whether to render the button; this is what's actually enforced. */
export async function getRefundEligibility(orderId: string): Promise<RefundEligibility> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order) return { eligible: false, reason: "Order not found." };

  if (order.paymentMethod !== "RAZORPAY") {
    return { eligible: false, reason: "COD orders are not refunded through Razorpay — no online payment was captured." };
  }
  if (!order.payment || !order.payment.razorpayPaymentId) {
    return { eligible: false, reason: "No captured Razorpay payment exists for this order." };
  }
  if (order.status !== "CANCELLED" && order.status !== "RETURNED") {
    return { eligible: false, reason: "Only cancelled or returned orders are eligible for a refund." };
  }
  if (order.payment.refundStatus === "PROCESSED") {
    return { eligible: false, reason: "This payment has already been refunded." };
  }

  const alreadyRefunded = order.payment.refundedAmount ? Number(order.payment.refundedAmount) : 0;
  const maxRefundableAmount = Number(order.payment.amount) - alreadyRefunded;
  if (maxRefundableAmount <= 0) {
    return { eligible: false, reason: "Nothing remains to refund on this payment." };
  }

  return { eligible: true, maxRefundableAmount };
}

export interface InitiateRefundInput {
  orderId: string;
  /** Rupees. Defaults to the full remaining refundable amount when omitted — Part 9's "full refund" case. A smaller value is a partial refund (Razorpay supports this natively); never validated to exceed the captured amount minus whatever's already been refunded. */
  amount?: number;
  actorUserId: string;
}

export interface InitiateRefundResult {
  success: boolean;
  error?: string;
  refundStatus?: "PENDING" | "PROCESSED" | "FAILED";
}

export async function initiateRefund(input: InitiateRefundInput): Promise<InitiateRefundResult> {
  const { orderId, actorUserId } = input;

  const eligibility = await getRefundEligibility(orderId);
  if (!eligibility.eligible || eligibility.maxRefundableAmount === undefined) {
    return { success: false, error: eligibility.reason ?? "This order is not eligible for a refund." };
  }

  const amount = input.amount ?? eligibility.maxRefundableAmount;
  if (amount <= 0 || amount > eligibility.maxRefundableAmount + 0.005) {
    return { success: false, error: `Refund amount must be between ₹0.01 and ₹${eligibility.maxRefundableAmount.toFixed(2)}.` };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  const payment = order!.payment!;
  const amountPaise = Math.round(amount * 100);
  const idempotencyKey = buildIdempotencyKey(payment.razorpayPaymentId!, amountPaise);

  // Local PENDING record written before the external call — an operational
  // breadcrumb (Part 10's "distinguish pending/processed/failed"), not the
  // safety mechanism itself (that's the idempotency key below). If the
  // process crashes right after this write and before the call, the next
  // attempt still reuses the identical key for the identical amount, so
  // it's still safe.
  await prisma.payment.update({ where: { id: payment.id }, data: { refundStatus: "PENDING", refundInitiatedAt: new Date() } });
  try {
    await logActivity(prisma, {
      userId: actorUserId,
      action: "payment.refund_initiated",
      entity: "Order",
      entityId: orderId,
      metadata: {
        paymentId: payment.id,
        razorpayPaymentId: payment.razorpayPaymentId!,
        refundAmount: amount.toFixed(2),
        previousRefundStatus: payment.refundStatus,
        newRefundStatus: "PENDING",
      },
    });
  } catch (err) {
    console.error("[razorpay-refund] failed to write initiation ActivityLog (refund attempt still proceeds)", err);
  }

  let apiResult: Awaited<ReturnType<typeof callRazorpayRefundApi>>;
  try {
    apiResult = await callRazorpayRefundApi(payment.razorpayPaymentId!, amountPaise, idempotencyKey);
  } catch (err) {
    console.error("[razorpay-refund] network/call error", orderId, err);
    return await applyRefundOutcome(order!, payment, { status: "FAILED", failureReason: "Network error contacting Razorpay." }, actorUserId);
  }

  if (!apiResult.ok) {
    if (apiResult.conflict) {
      // Still pending, not a failure — leave the PENDING record as-is; the
      // webhook (or a later retry with the same key) resolves it.
      return { success: true, refundStatus: "PENDING" };
    }
    return await applyRefundOutcome(order!, payment, { status: "FAILED", failureReason: `Razorpay returned HTTP ${apiResult.httpStatus}.` }, actorUserId);
  }

  const razorpayStatus = apiResult.result.status;
  return await applyRefundOutcome(
    order!,
    payment,
    {
      status: razorpayStatus === "processed" ? "PROCESSED" : razorpayStatus === "failed" ? "FAILED" : "PENDING",
      razorpayRefundId: apiResult.result.id,
      refundedAmount: apiResult.result.amountPaise / 100,
    },
    actorUserId
  );
}

interface RefundOutcome {
  status: "PENDING" | "PROCESSED" | "FAILED";
  razorpayRefundId?: string;
  refundedAmount?: number;
  failureReason?: string;
}

/**
 * Shared by both the synchronous initiate call above and the webhook
 * handler (extended /api/payment/razorpay/webhook route) — a single place
 * that writes the DB update + ActivityLog + notification, so both paths
 * produce identical, non-duplicated results no matter which one observes
 * the final status first (mirrors razorpay-finalize.ts's existing
 * verify-vs-webhook idempotency pattern).
 */
export async function applyRefundOutcome(
  order: { id: string; orderNumber: string; userId: string | null; customerEmail: string; customerPhone: string; customerName: string },
  payment: Payment,
  outcome: RefundOutcome,
  /** Null only for a webhook-driven update with no resolvable initiating admin (see findRefundInitiatingActor's header comment) — the Payment row is still updated and the notification still fires, but no ActivityLog row is written, rather than inventing an actor. */
  actorUserId: string | null
): Promise<InitiateRefundResult> {
  // Idempotent no-op: a stale/duplicate delivery reporting the SAME status
  // this payment is already in changes nothing and logs nothing (Module 24's
  // established "no real change, no audit row" rule, applied here).
  if (payment.refundStatus === outcome.status && (outcome.status !== "PROCESSED" || payment.razorpayRefundId === outcome.razorpayRefundId)) {
    return { success: outcome.status !== "FAILED", refundStatus: outcome.status };
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      refundStatus: outcome.status,
      ...(outcome.razorpayRefundId ? { razorpayRefundId: outcome.razorpayRefundId } : {}),
      ...(outcome.refundedAmount !== undefined ? { refundedAmount: outcome.refundedAmount } : {}),
      ...(outcome.status === "PROCESSED" ? { refundedAt: new Date(), status: "REFUNDED" } : {}),
    },
  });

  if (actorUserId) {
    try {
      await logActivity(prisma, {
        userId: actorUserId,
        action: outcome.status === "PROCESSED" ? "payment.refund_completed" : outcome.status === "FAILED" ? "payment.refund_failed" : "payment.refund_initiated",
        entity: "Order",
        entityId: order.id,
        metadata: {
          paymentId: payment.id,
          razorpayPaymentId: payment.razorpayPaymentId ?? "",
          razorpayRefundId: outcome.razorpayRefundId,
          refundAmount: (outcome.refundedAmount ?? Number(payment.amount)).toFixed(2),
          previousRefundStatus: payment.refundStatus,
          newRefundStatus: outcome.status,
          ...(outcome.failureReason ? { failureReason: outcome.failureReason } : {}),
        },
      });
    } catch (err) {
      console.error("[razorpay-refund] failed to write outcome ActivityLog (payment update was not affected)", err);
    }
  } else {
    console.error(
      "[razorpay-refund] no initiating admin found for this refund (System-actor gap, Module 23/28) — Payment row updated, but no ActivityLog row was written for order",
      order.id
    );
  }

  const eventType = outcome.status === "PROCESSED" ? "payment.refund_processed" : outcome.status === "FAILED" ? "payment.refund_failed" : "payment.refund_initiated";
  await emit(eventType, {
    userId: order.userId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    email: order.customerEmail,
    phone: order.customerPhone,
    name: order.customerName,
    amount: outcome.refundedAmount ?? Number(payment.amount),
  });

  return { success: outcome.status !== "FAILED", error: outcome.failureReason, refundStatus: updated.refundStatus ?? undefined };
}

/**
 * Resolves the actor for a WEBHOOK-driven update (Module 28 Part 12/14 —
 * the system-actor problem, first identified Module 23, still unresolved
 * at the schema level). A refund webhook is always confirming an action a
 * real admin explicitly initiated — never a cold, unsolicited event — so
 * the honest actor is whoever initiated it, recoverable from the
 * `payment.refund_initiated` ActivityLog row this same service already
 * writes. If no such row exists (e.g. a refund created directly in the
 * Razorpay dashboard, bypassing this app entirely), there is NO safe actor
 * to attribute the completion to — the Payment row is still updated (the
 * refund is real and must be reflected), but no ActivityLog row is written
 * for it, and this is logged loudly rather than inventing an admin.
 */
export async function findRefundInitiatingActor(orderId: string): Promise<string | null> {
  const row = await prisma.activityLog.findFirst({
    where: { entity: "Order", entityId: orderId, action: "payment.refund_initiated" },
    orderBy: { createdAt: "desc" },
    select: { userId: true },
  });
  return row?.userId ?? null;
}

/**
 * Handles a real `refund.processed` / `refund.failed` Razorpay webhook
 * event (extends the existing /api/payment/razorpay/webhook route — Part
 * 11's explicit "audit whether the existing webhook architecture can
 * safely process refund events... implement them" using the confirmed
 * payload shape from razorpay.com/docs/webhooks/payloads/refunds/). Locates
 * the Payment row by `razorpayPaymentId` (already an existing, populated
 * field — no new lookup mechanism needed) and routes through the same
 * applyRefundOutcome() the synchronous initiate call uses, so a webhook
 * arriving before, after, or instead of the synchronous response always
 * converges on the same, non-duplicated result.
 */
export async function handleRazorpayRefundWebhookEvent(params: {
  razorpayPaymentId: string;
  razorpayRefundId: string;
  status: "processed" | "failed";
  amountPaise: number;
}): Promise<{ handled: boolean; reason?: string }> {
  const payment = await prisma.payment.findFirst({
    where: { razorpayPaymentId: params.razorpayPaymentId },
    include: { order: { select: { id: true, orderNumber: true, userId: true, customerEmail: true, customerPhone: true, customerName: true } } },
  });
  if (!payment) {
    return { handled: false, reason: `No Payment row found for razorpayPaymentId ${params.razorpayPaymentId}.` };
  }

  const actorUserId = await findRefundInitiatingActor(payment.order.id);
  await applyRefundOutcome(
    payment.order,
    payment,
    {
      status: params.status === "processed" ? "PROCESSED" : "FAILED",
      razorpayRefundId: params.razorpayRefundId,
      refundedAmount: params.amountPaise / 100,
      failureReason: params.status === "failed" ? "Reported failed by Razorpay refund.failed webhook." : undefined,
    },
    actorUserId
  );
  return { handled: true };
}
