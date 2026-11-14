import "server-only";
import Razorpay from "razorpay";
// Deep import: validatePaymentVerification is not re-exported as a static
// on the default Razorpay class in the installed razorpay@2.9.4 — confirmed
// by inspecting node_modules/razorpay/dist directly rather than assuming
// from documentation aimed at a possibly-different SDK version.
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";

let client: Razorpay | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to your .env file to use Razorpay payments.`);
  }
  return value;
}

function getClient(): Razorpay {
  if (!client) {
    client = new Razorpay({
      key_id: getEnv("RAZORPAY_KEY_ID"),
      key_secret: getEnv("RAZORPAY_KEY_SECRET"),
    });
  }
  return client;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  amountPaid: number;
  currency: string;
  status: "created" | "attempted" | "paid";
  notes: Record<string, unknown>;
}

/**
 * Creates a Razorpay order with auto-capture (Module 11 decision — avoids
 * needing an AUTHORIZED payment status). `payment_capture` is the classic
 * top-level Razorpay REST field; the installed SDK's bundled TypeScript
 * defs only model the newer `payment.capture` shape, so this is typed
 * loosely rather than force-fit into a type that would silently drop the
 * field or require unrelated manual-capture options.
 */
export async function createRazorpayOrder(params: {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrderResult> {
  const order = await getClient().orders.create({
    amount: params.amountPaise,
    currency: params.currency ?? "INR",
    receipt: params.receipt,
    payment_capture: 1,
    notes: params.notes,
  } as unknown as Parameters<Razorpay["orders"]["create"]>[0]);

  return {
    id: order.id,
    amount: Number(order.amount),
    amountPaid: Number(order.amount_paid),
    currency: order.currency,
    status: order.status,
    notes: (order.notes as Record<string, unknown>) ?? {},
  };
}

/** Always re-fetched from Razorpay's server — never trust order state passed by the client. */
export async function fetchRazorpayOrder(razorpayOrderId: string): Promise<RazorpayOrderResult> {
  const order = await getClient().orders.fetch(razorpayOrderId);
  return {
    id: order.id,
    amount: Number(order.amount),
    amountPaid: Number(order.amount_paid),
    currency: order.currency,
    status: order.status,
    notes: (order.notes as Record<string, unknown>) ?? {},
  };
}

/**
 * Verifies the browser-callback signature (Checkout.js `handler`). Uses
 * RAZORPAY_KEY_SECRET — distinct from the webhook secret. This proves the
 * payload wasn't tampered with in transit; it does NOT by itself prove the
 * payment is real (Section 3 of the Module 11 analysis) — finalize() still
 * re-fetches the order from Razorpay's server before trusting anything.
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  return validatePaymentVerification(
    { order_id: params.razorpayOrderId, payment_id: params.razorpayPaymentId },
    params.razorpaySignature,
    getEnv("RAZORPAY_KEY_SECRET")
  );
}

/**
 * Verifies a webhook delivery. Must be called with the RAW request body
 * (string, not re-serialized JSON) and the `x-razorpay-signature` header.
 * Uses RAZORPAY_WEBHOOK_SECRET — a separate secret from the API key pair.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  return Razorpay.validateWebhookSignature(rawBody, signatureHeader, getEnv("RAZORPAY_WEBHOOK_SECRET"));
}
