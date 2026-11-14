/**
 * Local integration test harness for the Razorpay webhook route — signs a
 * synthetic event with the real RAZORPAY_WEBHOOK_SECRET from .env (so
 * signature verification passes exactly as it would for a genuine
 * Razorpay-delivered webhook) and POSTs it to the local dev server.
 *
 * This never calls Razorpay's real API — it only exercises OUR OWN webhook
 * handler (src/app/api/payment/razorpay/webhook/route.ts), which is the
 * boundary that matters for local testing: no live/production Razorpay
 * credentials are required or used.
 *
 * Usage:
 *   npx tsx scripts/simulate-razorpay-webhook.ts payment.captured order_xxx pay_xxx
 *   npx tsx scripts/simulate-razorpay-webhook.ts payment.failed order_xxx pay_xxx
 *
 * Notes:
 * - For payment.captured to actually finalize an order, order_xxx must be a
 *   real Razorpay order id with a valid attempt snapshot in its notes
 *   (created via the real /api/payment/razorpay/create-order flow) — this
 *   script only proves the webhook route's signature verification and
 *   routing are correct, it doesn't fabricate Razorpay order state.
 * - For payment.failed, this script alone is enough to exercise the full
 *   path IF order_xxx is a real attempt order id (same requirement).
 * - Requires RAZORPAY_WEBHOOK_SECRET in .env (already present for local
 *   dev per this project's existing convention) and a running dev server.
 */
import { readFileSync } from "fs";
import { createHmac } from "crypto";

const [, , eventArg, razorpayOrderId, razorpayPaymentId] = process.argv;

if (!eventArg || !razorpayOrderId) {
  console.error("Usage: npx tsx scripts/simulate-razorpay-webhook.ts <payment.captured|payment.failed> <razorpayOrderId> [razorpayPaymentId]");
  process.exit(1);
}
if (eventArg !== "payment.captured" && eventArg !== "payment.failed") {
  console.error('Event must be "payment.captured" or "payment.failed"');
  process.exit(1);
}

function readEnvSecret(): string {
  const envContent = readFileSync(".env", "utf8");
  const match = envContent.match(/^RAZORPAY_WEBHOOK_SECRET=(.*)$/m);
  const secret = match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET not found in .env");
  return secret;
}

async function main() {
  const secret = readEnvSecret();
  const port = process.env.DEV_PORT || "3000";
  const paymentId = razorpayPaymentId || `pay_sim_${Date.now()}`;

  const body = JSON.stringify({
    event: eventArg,
    payload: { payment: { entity: { id: paymentId, order_id: razorpayOrderId } } },
  });
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  const url = `http://localhost:${port}/api/payment/razorpay/webhook`;
  console.log(`POST ${url}`);
  console.log(`event=${eventArg} order_id=${razorpayOrderId} payment_id=${paymentId}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": signature },
    body,
  });
  const text = await res.text();
  console.log(`HTTP ${res.status}`, text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
