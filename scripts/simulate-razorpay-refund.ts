/**
 * Local integration test harness for the Module 28 Razorpay refund system
 * — exercises the REAL running app (admin status API, admin refund API,
 * the real Razorpay webhook route) against the local dev server and
 * database, the same way simulate-cod-risk.ts / simulate-shipment.ts do.
 *
 * IMPORTANT — what is and isn't a "real" test here:
 *   - Eligibility/validation/security tests (1-5, 11) exercise 100% real
 *     code with zero mocking.
 *   - The "refund fails" test (7) is a REAL failure, not a simulated one:
 *     RAZORPAY_KEY_ID/SECRET are empty in this dev environment, so the
 *     actual refund HTTP call genuinely fails — this IS what a
 *     credential-misconfigured production deployment would experience.
 *   - The "refund succeeds" test (8) cannot reach a real Razorpay 2xx
 *     response (no credentials exist to test against). Instead it POSTs a
 *     correctly-HMAC-signed `refund.processed` webhook event, using
 *     Razorpay's own CONFIRMED, publicly-documented webhook payload shape
 *     (razorpay.com/docs/webhooks/payloads/refunds/) and the REAL,
 *     unmodified signature verification already used for payment webhooks
 *     — exactly the same technique simulate-razorpay-webhook.ts already
 *     uses for payment.captured. This proves our OWN webhook handler and
 *     DB-update logic are correct; it does NOT prove Razorpay will ever
 *     send this exact payload for a real refund (their docs strongly
 *     suggest this shape but this was never observed from a live account).
 *
 * Requires: `npm run dev` running locally, RAZORPAY_WEBHOOK_SECRET set in
 * .env (already present), and a SUPER_ADMIN/ADMIN account (defaults to the
 * seeded admin@kutir.in / Admin@12345).
 *
 * Usage:
 *   npm run simulate:razorpay-refund
 *   npm run simulate:razorpay-refund -- --keep
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { createHmac } from "crypto";

const prisma = new PrismaClient();
const PORT = process.env.DEV_PORT || "3000";
const BASE = `http://localhost:${PORT}`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@kutir.in";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345";
const KEEP = process.argv.includes("--keep");
const RUN_ID = Date.now().toString(36);

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? "");
}
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
}
function extractCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("No Set-Cookie header in response");
  return setCookie.split(";")[0];
}
function readEnvSecret(name: string): string {
  const envContent = readFileSync(".env", "utf8");
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, "m"));
  const secret = match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
  if (!secret) throw new Error(`${name} not found in .env`);
  return secret;
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  return extractCookie(res);
}
async function register(email: string, name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "QaTest12345!", phone: "9876543210" }),
  });
  if (!res.ok) throw new Error(`register failed: ${res.status} ${await res.text()}`);
  return extractCookie(res);
}

async function setStatus(adminCookie: string, orderId: string, status: string, statusReason?: string) {
  const res = await fetch(`${BASE}/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ status, statusReason }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`status update to ${status} failed: ${JSON.stringify(json)}`);
}

async function getRefundEligibility(cookie: string, orderId: string): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}/api/admin/orders/${orderId}/refund`, { headers: { Cookie: cookie } });
  return { status: res.status, json: await res.json() };
}
async function postRefund(cookie: string, orderId: string, body: Record<string, unknown> = {}): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}/api/admin/orders/${orderId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

const SNAPSHOT_ADDRESS = {
  fullName: "QA Refund Test",
  phone: "9876543210",
  line1: "1 Test Lane",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  country: "India",
  countryCode: "IN",
};

/** Directly-created Order+Payment (RAZORPAY, PAID) — the real checkout flow can't complete without real credentials, so this seeds the exact DB state a completed Razorpay checkout would have produced, clearly QA-labeled. */
async function createRazorpayPaidOrder(userId: string, suffix: string, total: number): Promise<{ orderId: string; razorpayPaymentId: string }> {
  const orderNumber = `QA-REFUND-${RUN_ID}-${suffix}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      status: "PENDING",
      customerName: SNAPSHOT_ADDRESS.fullName,
      customerEmail: `qa-refund-${RUN_ID}@example.test`,
      customerPhone: SNAPSHOT_ADDRESS.phone,
      shippingAddress: SNAPSHOT_ADDRESS,
      billingAddress: SNAPSHOT_ADDRESS,
      subtotal: total,
      shippingCharge: 0,
      taxAmount: 0,
      discountAmount: 0,
      total,
      paymentMethod: "RAZORPAY",
    },
  });
  const razorpayPaymentId = `pay_QASIM_${RUN_ID}_${suffix}`;
  await prisma.payment.create({
    data: { orderId: order.id, method: "RAZORPAY", status: "PAID", razorpayOrderId: `order_QASIM_${RUN_ID}_${suffix}`, razorpayPaymentId, amount: total },
  });
  return { orderId: order.id, razorpayPaymentId };
}

async function postRefundWebhook(
  secret: string,
  event: "refund.processed" | "refund.failed",
  razorpayPaymentId: string,
  razorpayRefundId: string,
  amountPaise: number
): Promise<{ status: number; json: any }> {
  // Confirmed shape: razorpay.com/docs/webhooks/payloads/refunds/
  const body = JSON.stringify({
    entity: "event",
    account_id: "acc_QASIM",
    event,
    contains: ["refund", "payment"],
    payload: {
      refund: { entity: { id: razorpayRefundId, entity: "refund", amount: amountPaise, currency: "INR", payment_id: razorpayPaymentId, status: event === "refund.processed" ? "processed" : "failed" } },
      payment: { entity: { id: razorpayPaymentId } },
    },
    created_at: Math.floor(Date.now() / 1000),
  });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const res = await fetch(`${BASE}/api/payment/razorpay/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": signature },
    body,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  const webhookSecret = readEnvSecret("RAZORPAY_WEBHOOK_SECRET");
  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!adminUser) throw new Error("admin user not found");

  const customerEmail = `qa-refund-cust-${RUN_ID}@example.test`;
  const customerCookie = await register(customerEmail, "QA Refund Customer");
  const customer = await prisma.user.findUnique({ where: { email: customerEmail }, select: { id: true } });
  log("Setup", { adminUserId: adminUser.id, customerId: customer!.id });

  // --- Test 1: COD order refund rejected ---
  const codOrder = await prisma.order.create({
    data: {
      orderNumber: `QA-REFUND-${RUN_ID}-COD`,
      userId: customer!.id,
      status: "PENDING",
      customerName: SNAPSHOT_ADDRESS.fullName,
      customerEmail,
      customerPhone: SNAPSHOT_ADDRESS.phone,
      shippingAddress: SNAPSHOT_ADDRESS,
      billingAddress: SNAPSHOT_ADDRESS,
      subtotal: 500,
      shippingCharge: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 500,
      paymentMethod: "COD",
    },
  });
  const codEligibility = await getRefundEligibility(adminCookie, codOrder.id);
  assert(codEligibility.status === 200 && codEligibility.json.data.eligible === false, "Test 1: COD order refund eligibility is false");
  const codRefundAttempt = await postRefund(adminCookie, codOrder.id);
  assert(codRefundAttempt.status === 400, "Test 1: COD order refund POST rejected (400)");

  // --- Test 2: RAZORPAY order but no captured payment / wrong status ---
  const { orderId: orderA, razorpayPaymentId: paymentAId } = await createRazorpayPaidOrder(customer!.id, "A", 1000);
  const stillPendingEligibility = await getRefundEligibility(adminCookie, orderA);
  assert(stillPendingEligibility.json.data.eligible === false, "Test 3: PENDING (not yet cancelled/returned) order refund eligibility is false");
  const stillPendingAttempt = await postRefund(adminCookie, orderA);
  assert(stillPendingAttempt.status === 400, "Test 3: refund rejected for an order that hasn't been cancelled/returned");

  // Move order A to CANCELLED via the REAL, unmodified status-service.ts path.
  await setStatus(adminCookie, orderA, "CANCELLED", "OTHER");
  const paymentAAfterCancel = await prisma.payment.findFirst({ where: { orderId: orderA } });
  assert(paymentAAfterCancel?.status === "REFUNDED", "Existing status-service.ts behavior unchanged: Payment.status still auto-flips to REFUNDED on cancel of a PAID order");
  assert(paymentAAfterCancel?.refundStatus === null, "New refundStatus field is still null — the old flip is NOT a real refund (this module's whole point)");

  const nowEligible = await getRefundEligibility(adminCookie, orderA);
  assert(nowEligible.json.data.eligible === true && nowEligible.json.data.maxRefundableAmount === 1000, "Test: order A now eligible with correct max refundable amount");

  // --- Test 4: amount exceeds captured amount ---
  const tooMuch = await postRefund(adminCookie, orderA, { amount: 5000 });
  assert(tooMuch.status === 400, "Test 4: refund amount exceeding captured amount rejected");

  // --- Test 5 / 11: unauthorized actors ---
  const unauthRes = await fetch(`${BASE}/api/admin/orders/${orderA}/refund`, { method: "POST" });
  assert(unauthRes.status === 401, "Test 11: unauthenticated cannot initiate refund");
  const custRes = await postRefund(customerCookie, orderA);
  assert(custRes.status === 401 || custRes.status === 403, "Test 11: CUSTOMER cannot initiate refund");

  const staffEmail = `qa-refund-staff-${RUN_ID}@example.test`;
  await register(staffEmail, "QA Refund Staff");
  const staffUser = await prisma.user.findUnique({ where: { email: staffEmail } });
  await prisma.user.update({ where: { id: staffUser!.id }, data: { role: "SUPPORT_STAFF" } });
  const staffCookie = await login(staffEmail, "QaTest12345!");
  const staffRes = await postRefund(staffCookie, orderA);
  assert(staffRes.status === 403, "Test 11: SUPPORT_STAFF (read-only) cannot initiate refund");

  // --- Test 7: real refund failure (no Razorpay credentials in this dev env) leaves correct DB state ---
  const failedAttempt = await postRefund(adminCookie, orderA);
  assert(failedAttempt.status === 400, "Test 7: refund attempt genuinely fails (no RAZORPAY_KEY_ID/SECRET configured)");
  const paymentAAfterFail = await prisma.payment.findFirst({ where: { orderId: orderA } });
  assert(paymentAAfterFail?.refundStatus === "FAILED", "Test 7: Payment.refundStatus correctly left as FAILED, not stuck PENDING or falsely PROCESSED");
  const initiatedLog = await prisma.activityLog.findFirst({ where: { entity: "Order", entityId: orderA, action: "payment.refund_initiated" } });
  const failedLog = await prisma.activityLog.findFirst({ where: { entity: "Order", entityId: orderA, action: "payment.refund_failed" } });
  assert(!!initiatedLog && !!failedLog, "Test 9: ActivityLog rows written for both refund_initiated and refund_failed");

  // --- Test 8: refund success via a real, correctly-signed refund.processed webhook (separate order B) ---
  const { orderId: orderB, razorpayPaymentId: paymentBId } = await createRazorpayPaidOrder(customer!.id, "B", 2000);
  await setStatus(adminCookie, orderB, "PACKED");
  await setStatus(adminCookie, orderB, "READY_TO_SHIP");
  await setStatus(adminCookie, orderB, "SHIPPED");
  await setStatus(adminCookie, orderB, "OUT_FOR_DELIVERY");
  await setStatus(adminCookie, orderB, "DELIVERED");
  await setStatus(adminCookie, orderB, "RETURNED", "CUSTOMER_REQUESTED_RETURN");
  // Initiate (will also fail locally for the same credential reason — but this is what establishes the payment.refund_initiated actor row the webhook handler needs).
  await postRefund(adminCookie, orderB);
  const razorpayRefundId = `rfnd_QASIM_${RUN_ID}`;
  const webhookResult = await postRefundWebhook(webhookSecret, "refund.processed", paymentBId, razorpayRefundId, 200000);
  assert(webhookResult.status === 200, "Test 8: signed refund.processed webhook accepted");
  const paymentBAfterWebhook = await prisma.payment.findFirst({ where: { orderId: orderB } });
  assert(paymentBAfterWebhook?.refundStatus === "PROCESSED", "Test 8: Payment.refundStatus updated to PROCESSED by the webhook");
  assert(paymentBAfterWebhook?.razorpayRefundId === razorpayRefundId, "Test 8: razorpayRefundId persisted correctly");
  assert(Number(paymentBAfterWebhook?.refundedAmount) === 2000, "Test 8: refundedAmount correctly converted from paise");
  assert(!!paymentBAfterWebhook?.refundedAt, "Test 8: refundedAt timestamp set");
  const completedLog = await prisma.activityLog.findFirst({ where: { entity: "Order", entityId: orderB, action: "payment.refund_completed" } });
  assert(!!completedLog && completedLog.userId === adminUser.id, "Test 9: payment.refund_completed ActivityLog written, attributed to the original initiating admin (not a fabricated actor)");

  // --- Test 6: duplicate refund is safely rejected once already PROCESSED ---
  const dupEligibility = await getRefundEligibility(adminCookie, orderB);
  assert(dupEligibility.json.data.eligible === false, "Test 6: order B no longer eligible after being fully refunded");
  const dupAttempt = await postRefund(adminCookie, orderB);
  assert(dupAttempt.status === 400, "Test 6: duplicate refund POST rejected");

  // --- Duplicate webhook delivery is a safe no-op ---
  const activityCountBeforeReplay = await prisma.activityLog.count({ where: { entity: "Order", entityId: orderB } });
  const replayWebhook = await postRefundWebhook(webhookSecret, "refund.processed", paymentBId, razorpayRefundId, 200000);
  assert(replayWebhook.status === 200, "Replayed refund.processed webhook acknowledged");
  const activityCountAfterReplay = await prisma.activityLog.count({ where: { entity: "Order", entityId: orderB } });
  assert(activityCountAfterReplay === activityCountBeforeReplay, "Replayed webhook creates no new ActivityLog row (idempotent no-op)");

  // --- Unknown payment id webhook is acknowledged without mutation ---
  const unknownWebhook = await postRefundWebhook(webhookSecret, "refund.processed", "pay_does_not_exist", "rfnd_unknown", 100);
  assert(unknownWebhook.status === 200, "Webhook for an unknown razorpayPaymentId is acknowledged (200), not an error");

  // --- Invalid webhook signature rejected ---
  const badSigRes = await fetch(`${BASE}/api/payment/razorpay/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": "0".repeat(64) },
    body: JSON.stringify({ event: "refund.processed", payload: {} }),
  });
  assert(badSigRes.status === 401, "Invalid webhook signature rejected (401)");

  void paymentAId;
  console.log("\n✅ All Module 28 refund simulation checks passed.");

  if (!KEEP) {
    const qaOrderIds = [codOrder.id, orderA, orderB];
    const delActivity = await prisma.activityLog.deleteMany({ where: { OR: [{ entity: "Order", entityId: { in: qaOrderIds } }, { entity: "User", entityId: { in: [customer!.id, staffUser!.id] } }] } });
    log("Cleanup: ActivityLog rows removed", delActivity.count);
    const allNotifs = await prisma.notification.findMany({ select: { id: true, metadata: true } });
    const notifIds = allNotifs.filter((n) => qaOrderIds.some((id) => JSON.stringify(n.metadata ?? {}).includes(id))).map((n) => n.id);
    if (notifIds.length) {
      const delNotifs = await prisma.notification.deleteMany({ where: { id: { in: notifIds } } });
      log("Cleanup: Notification rows removed", delNotifs.count);
    }
    const delOrders = await prisma.order.deleteMany({ where: { id: { in: qaOrderIds } } });
    log("Cleanup: Order rows removed (cascades Payment)", delOrders.count);
    const delUsers = await prisma.user.deleteMany({ where: { id: { in: [customer!.id, staffUser!.id] } } });
    log("Cleanup: User rows removed", delUsers.count);
  } else {
    log("Cleanup skipped (--keep)", { orderA, orderB, codOrder: codOrder.id });
  }
}

main()
  .catch((err) => {
    console.error("\n❌ Simulation failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
