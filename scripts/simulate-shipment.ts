/**
 * Local integration test harness for the shipment-integration architecture
 * (Modules 23/27) — exercises the REAL running app (checkout, admin status
 * API, admin create-shipment route, the shipment webhook route) against the
 * local dev server and database, the same way simulate-razorpay-webhook.ts
 * and simulate-cod-risk.ts do.
 *
 * IMPORTANT — these are MOCK/ARCHITECTURE tests, not real Shiprocket tests:
 * this script requires SHIPPING_PROVIDER=mock (the default) and exercises
 * MockShipmentProvider — no real Shiprocket API call is made. The webhook
 * events posted here use OUR OWN local envelope + SHIPMENT_WEBHOOK_SECRET,
 * not Shiprocket's real (and not publicly documented) webhook contract —
 * see shiprocket-provider.ts's header comment. Real-provider, real-credential
 * tests are NOT run by this script and were NOT run this module — no
 * Shiprocket account exists to test against.
 *
 * Requires: `npm run dev` running locally, SHIPMENT_WEBHOOK_SECRET set in
 * .env, SHIPPING_PROVIDER=mock (or unset), and a SUPER_ADMIN/ADMIN account
 * to drive order-status changes (defaults to the seeded admin@kutir.in /
 * Admin@12345 — override with ADMIN_EMAIL/ADMIN_PASSWORD env vars).
 *
 * Usage:
 *   npm run simulate:shipment
 *   npm run simulate:shipment -- --keep   (skip cleanup, for manual inspection)
 *
 * What it proves, end to end (mock provider only):
 *   1. Admin can create a (mock) shipment for a packed/ready order — courier
 *      + tracking number get persisted via the EXISTING Module 24
 *      shipment-update path (not a direct DB write).
 *   2. A second shipment-creation attempt on the SAME order is rejected —
 *      the Module 27 duplicate-shipment guard.
 *   3. A "picked up" webhook event maps to SHIPPED via the EXISTING
 *      status-service.ts (Module 24) — never a direct Order.status write.
 *   4. An "in transit" event is acknowledged but produces NO Order/ActivityLog
 *      change (info-only, per status-mapping.ts).
 *   5. "out for delivery" / "delivered" events progress the order correctly.
 *   6. An "RTO initiated" event on a SEPARATE order does NOT change
 *      Order.status — it's flagged via ActivityLog for manual review instead.
 *   7. A webhook with an unknown tracking number is acknowledged (200) but
 *      changes nothing.
 *   8. A webhook with an invalid signature is rejected (401).
 *   9. A webhook whose actorUserId is not real order-management staff is
 *      rejected (400) — a customer/unprivileged id can't be used to
 *      attribute a status change.
 *
 * All data created here uses @example.test emails/order numbers and is
 * deleted at the end unless --keep is passed.
 *
 * MODULE 35 — real-product stock baseline restoration:
 * Both orders this script places use a REAL catalog product (whatever
 * /api/products?pageSize=1 returns — never hardcoded). Order A reaches
 * DELIVERED, which correctly means "sold" and is never auto-restocked.
 * Order B is deliberately left at OUT_FOR_DELIVERY with an RTO event only
 * flagged for manual review (that's exactly what's being tested — the app
 * must NOT auto-resolve it) — so it also never reaches CANCELLED/RETURNED,
 * the only two statuses that trigger a restock. Both orders therefore leave
 * that product's stockAvailable net-decremented by design. The old cleanup
 * only deleted the audit StockMovement rows (by matching their `note`
 * against this run's order numbers) without ever reversing this net effect
 * on the live counter, silently leaking real stock on every run (see
 * Module 34's report). Fixed the same way as simulate-cod-risk.ts: capture
 * the touched product's REAL stockAvailable the moment this script first
 * touches it, then at cleanup diff the live value against that captured
 * baseline and reverse exactly that diff through the existing
 * adjustStock()-backed admin API. See captureStockBaseline() /
 * restoreStockBaselines() below.
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
const CUSTOMER_EMAIL = `qa-shipment-${RUN_ID}@example.test`;

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

function sign(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
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

async function adminLogin(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`admin login failed: ${res.status} ${await res.text()}`);
  return extractCookie(res);
}

// --- Module 35: real-product stock baseline capture/restore ---------------
// See the file header for why this exists. Never hardcodes a product id or
// a "correct" stock value — everything here is discovered live. Identical
// logic to simulate-cod-risk.ts's copy (this project's scripts are each
// fully self-contained by convention — see the other simulate-*.ts files —
// rather than sharing a scripts/lib module).
interface StockBaseline {
  sku: string;
  stockAvailable: number;
}
const stockBaselines = new Map<string, StockBaseline>();

async function captureStockBaseline(productId: string): Promise<void> {
  if (stockBaselines.has(productId)) return; // capture once per product per run — first sight only, before any mutation
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { sku: true, stockAvailable: true } });
  if (!product) throw new Error(`Cannot capture stock baseline — product ${productId} not found`);
  stockBaselines.set(productId, { sku: product.sku, stockAvailable: product.stockAvailable });
  log("Stock baseline captured", { productId, sku: product.sku, stockAvailable: product.stockAvailable });
}

/**
 * Diffs each touched product's LIVE stockAvailable against its captured
 * baseline and reverses exactly that diff through the existing
 * adjustStock()-backed admin stock API (same atomic, race-safe path
 * hardened in Module 34) — never a direct DB write. Verifies the exact
 * restored value afterward and throws loudly if it doesn't match (Part 14:
 * a cleanup failure must never be silently reported as clean). Only once
 * restoration is verified does it remove the correction StockMovement row
 * itself, matching this script's existing zero-residue QA cleanup policy
 * (stockReserved/stockDamaged are never touched here because no code path
 * in this app writes to either field at all — confirmed by a full
 * repository search, not an assumption).
 */
async function restoreStockBaselines(adminCookie: string): Promise<void> {
  for (const [productId, baseline] of stockBaselines) {
    const current = await prisma.product.findUnique({ where: { id: productId }, select: { stockAvailable: true } });
    if (!current) {
      log("Stock restore skipped", `product ${productId} (${baseline.sku}) no longer exists`);
      continue;
    }
    const diff = current.stockAvailable - baseline.stockAvailable;
    if (diff === 0) {
      log("Stock already at baseline", { sku: baseline.sku, stockAvailable: current.stockAvailable });
      continue;
    }

    const res = await fetch(`${BASE}/api/admin/products/${productId}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        change: -diff,
        reason: "correction",
        note: `QA simulator cleanup — reversing test inventory mutation (simulate-shipment run ${RUN_ID})`,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`Stock restoration FAILED for ${baseline.sku} (expected to reverse diff ${diff}): ${JSON.stringify(json)}`);
    }

    const verify = await prisma.product.findUnique({ where: { id: productId }, select: { stockAvailable: true } });
    if (verify?.stockAvailable !== baseline.stockAvailable) {
      throw new Error(
        `Stock restoration VERIFICATION FAILED for ${baseline.sku}: expected ${baseline.stockAvailable}, got ${verify?.stockAvailable}. Manual review required.`
      );
    }

    await prisma.stockMovement.delete({ where: { id: json.data.movement.id } });
    log("Stock restored to baseline (verified)", { sku: baseline.sku, reversedDiff: diff, finalStock: verify.stockAvailable });
  }
}
// ---------------------------------------------------------------------------

async function addFirstProductToCart(cookie: string) {
  const res = await fetch(`${BASE}/api/products?pageSize=1`, { headers: { Cookie: cookie } });
  const json = await res.json();
  const product = json?.data?.products?.[0];
  if (!product) throw new Error("No products found to add to cart — seed data required");
  await captureStockBaseline(product.id);
  await fetch(`${BASE}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ productId: product.id, quantity: 1 }),
  });
}

async function placeCodOrder(cookie: string): Promise<string> {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      email: CUSTOMER_EMAIL,
      paymentMethod: "COD",
      billingSameAsShipping: true,
      shippingAddress: {
        fullName: "QA Shipment Test",
        countryCode: "IN",
        phone: "9876543210",
        line1: "1 Test Lane",
        line2: "Near Test Landmark",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        country: "India",
      },
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`order placement failed: ${JSON.stringify(json)}`);
  return json.data.orderId;
}

async function setStatus(adminCookie: string, orderId: string, status: string) {
  const res = await fetch(`${BASE}/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`status update to ${status} failed: ${JSON.stringify(json)}`);
}

async function createShipmentRaw(adminCookie: string, orderId: string): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}/api/admin/orders/${orderId}/shipment`, {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function createShipment(adminCookie: string, orderId: string): Promise<{ trackingNumber: string; courierName: string }> {
  const { status, json } = await createShipmentRaw(adminCookie, orderId);
  if (status !== 200 || !json.success) throw new Error(`create shipment failed: ${JSON.stringify(json)}`);
  return json.data;
}

async function postWebhookEvent(
  secret: string,
  body: { trackingNumber: string; status: string; occurredAt: string; actorUserId: string },
  signatureOverride?: string
): Promise<{ status: number; json: any }> {
  const raw = JSON.stringify(body);
  const signature = signatureOverride ?? sign(secret, raw);
  const res = await fetch(`${BASE}/api/webhooks/shipment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-shipment-signature": signature },
    body: raw,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function runTest(customerCookie: string, adminCookie: string, adminUserId: string): Promise<{ orderA: string; orderB: string }> {
  const secret = readEnvSecret("SHIPMENT_WEBHOOK_SECRET");

  // --- Order A: happy path shipment lifecycle ---
  await addFirstProductToCart(customerCookie);
  const orderA = await placeCodOrder(customerCookie);
  await setStatus(adminCookie, orderA, "PACKED");
  await setStatus(adminCookie, orderA, "READY_TO_SHIP");
  log("Order A ready to ship", orderA);

  const shipment = await createShipment(adminCookie, orderA);
  assert(!!shipment.trackingNumber && !!shipment.courierName, "Mock shipment created with courier + tracking number");

  const duplicateAttempt = await createShipmentRaw(adminCookie, orderA);
  assert(duplicateAttempt.status === 400 && !duplicateAttempt.json.success, "A second shipment-creation attempt on the same order is rejected (duplicate guard, Module 27 Part 6)");

  const orderAfterShipment = await prisma.order.findUnique({ where: { id: orderA }, select: { status: true, trackingNumber: true, courierName: true } });
  assert(orderAfterShipment?.status === "READY_TO_SHIP", "Creating a shipment does not itself change order status");
  assert(orderAfterShipment?.trackingNumber === shipment.trackingNumber, "Order.trackingNumber persisted via the existing shipment-update path");

  const shipmentLog = await prisma.activityLog.findFirst({ where: { entity: "Order", entityId: orderA, action: "order.shipment_updated" } });
  assert(!!shipmentLog, "order.shipment_updated ActivityLog row written for the shipment creation");

  const pickedUp = await postWebhookEvent(secret, { trackingNumber: shipment.trackingNumber, status: "PICKED_UP", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  assert(pickedUp.status === 200, "picked_up webhook event acknowledged");
  const afterPickedUp = await prisma.order.findUnique({ where: { id: orderA }, select: { status: true } });
  assert(afterPickedUp?.status === "SHIPPED", "picked_up event correctly transitioned order to SHIPPED via status-service.ts");

  const inTransitLogCountBefore = await prisma.activityLog.count({ where: { entity: "Order", entityId: orderA } });
  const inTransit = await postWebhookEvent(secret, { trackingNumber: shipment.trackingNumber, status: "IN_TRANSIT", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  assert(inTransit.status === 200, "in_transit webhook event acknowledged");
  const inTransitLogCountAfter = await prisma.activityLog.count({ where: { entity: "Order", entityId: orderA } });
  assert(inTransitLogCountAfter === inTransitLogCountBefore, "in_transit event is info-only — no new ActivityLog row, no status change");
  const afterInTransit = await prisma.order.findUnique({ where: { id: orderA }, select: { status: true } });
  assert(afterInTransit?.status === "SHIPPED", "Order status unchanged by the info-only in_transit event");

  const ofd = await postWebhookEvent(secret, { trackingNumber: shipment.trackingNumber, status: "OUT_FOR_DELIVERY", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  assert(ofd.status === 200, "out_for_delivery webhook event acknowledged");
  const delivered = await postWebhookEvent(secret, { trackingNumber: shipment.trackingNumber, status: "DELIVERED", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  assert(delivered.status === 200, "delivered webhook event acknowledged");
  const finalOrderA = await prisma.order.findUnique({ where: { id: orderA }, select: { status: true } });
  assert(finalOrderA?.status === "DELIVERED", "Order A reached DELIVERED via webhook-driven transitions");

  // Replaying an already-applied event must be a safe no-op (idempotency via status-service.ts's existing alreadyInStatus guard).
  const logCountBeforeReplay = await prisma.activityLog.count({ where: { entity: "Order", entityId: orderA } });
  const replay = await postWebhookEvent(secret, { trackingNumber: shipment.trackingNumber, status: "DELIVERED", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  assert(replay.status === 200, "Replayed delivered webhook event acknowledged");
  const logCountAfterReplay = await prisma.activityLog.count({ where: { entity: "Order", entityId: orderA } });
  assert(logCountAfterReplay === logCountBeforeReplay, "Replaying an already-applied status event creates no new ActivityLog row (existing idempotency guard)");

  // --- Order B: ambiguous RTO event must be flagged, not auto-applied ---
  await addFirstProductToCart(customerCookie);
  const orderB = await placeCodOrder(customerCookie);
  await setStatus(adminCookie, orderB, "PACKED");
  await setStatus(adminCookie, orderB, "READY_TO_SHIP");
  const shipmentB = await createShipment(adminCookie, orderB);
  await postWebhookEvent(secret, { trackingNumber: shipmentB.trackingNumber, status: "PICKED_UP", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  await postWebhookEvent(secret, { trackingNumber: shipmentB.trackingNumber, status: "OUT_FOR_DELIVERY", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  log("Order B out for delivery", orderB);

  const rto = await postWebhookEvent(secret, { trackingNumber: shipmentB.trackingNumber, status: "RTO_INITIATED", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  assert(rto.status === 200, "RTO_INITIATED webhook event acknowledged");
  const orderBAfterRto = await prisma.order.findUnique({ where: { id: orderB }, select: { status: true } });
  assert(orderBAfterRto?.status === "OUT_FOR_DELIVERY", "RTO_INITIATED does NOT auto-change order status");
  const flaggedLog = await prisma.activityLog.findFirst({ where: { entity: "Order", entityId: orderB, action: "shipment.event_flagged" } });
  assert(!!flaggedLog, "RTO_INITIATED was recorded as a flagged ActivityLog entry for manual review");

  // --- Negative cases ---
  const unknownTracking = await postWebhookEvent(secret, { trackingNumber: "NO-SUCH-AWB-XYZ", status: "DELIVERED", occurredAt: new Date().toISOString(), actorUserId: adminUserId });
  assert(unknownTracking.status === 200 && unknownTracking.json?.data?.received === true, "Unknown tracking number is acknowledged (200) without error");

  const badSignature = await postWebhookEvent(secret, { trackingNumber: shipment.trackingNumber, status: "DELIVERED", occurredAt: new Date().toISOString(), actorUserId: adminUserId }, "0".repeat(64));
  assert(badSignature.status === 401, "Invalid signature is rejected (401)");

  const customerForCheck = await prisma.user.findUnique({ where: { email: CUSTOMER_EMAIL }, select: { id: true } });
  const badActor = await postWebhookEvent(secret, { trackingNumber: shipment.trackingNumber, status: "DELIVERED", occurredAt: new Date().toISOString(), actorUserId: customerForCheck!.id });
  assert(badActor.status === 400, "A customer id cannot be used as the webhook actorUserId (400)");

  console.log("\n✅ All Module 23 shipment simulation checks passed.");

  return { orderA, orderB };
}

async function cleanup(orderIds: string[], adminCookie: string) {
  // Module 35: reverse the net real-product stock effect FIRST, verified,
  // before touching any StockMovement rows below — deleting the audit
  // trail first (the old bug) would destroy the only evidence a correction
  // could be computed from.
  await restoreStockBaselines(adminCookie);

  const qaOrders = await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } });
  const qaOrderIds = qaOrders.map((o) => o.id);
  const qaOrderNumbers = qaOrders.map((o) => o.orderNumber);

  if (qaOrderNumbers.length > 0) {
    const delMovements = await prisma.stockMovement.deleteMany({ where: { OR: qaOrderNumbers.map((n) => ({ note: { contains: n } })) } });
    log("Cleanup: StockMovement rows removed", delMovements.count);
  }
  const delActivity = await prisma.activityLog.deleteMany({ where: { entity: "Order", entityId: { in: qaOrderIds } } });
  log("Cleanup: ActivityLog rows removed", delActivity.count);

  const allNotifs = await prisma.notification.findMany({ select: { id: true, metadata: true } });
  const notifIdsToDelete = allNotifs.filter((n) => qaOrderIds.some((id) => JSON.stringify(n.metadata ?? {}).includes(id))).map((n) => n.id);
  if (notifIdsToDelete.length > 0) {
    const delNotifs = await prisma.notification.deleteMany({ where: { id: { in: notifIdsToDelete } } });
    log("Cleanup: Notification rows removed", delNotifs.count);
  }

  const delOrders = await prisma.order.deleteMany({ where: { id: { in: qaOrderIds } } });
  log("Cleanup: Order rows removed", delOrders.count);

  const delUser = await prisma.user.deleteMany({ where: { email: CUSTOMER_EMAIL } });
  log("Cleanup: User rows removed", delUser.count);
}

async function main() {
  const customerCookie = await register(CUSTOMER_EMAIL, "QA Shipment Test");
  const adminCookie = await adminLogin();
  const adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!adminUser) throw new Error("admin user not found");
  log("Setup", { CUSTOMER_EMAIL, adminUserId: adminUser.id });

  // Module 35: test failure and cleanup failure are tracked and reported
  // independently — a bare try/finally would let a cleanup-block throw
  // silently replace/hide an earlier test failure. Cleanup always runs,
  // and only needs whichever order ids were actually created before any
  // failure (never assumes both orderA and orderB exist).
  let testError: unknown = null;
  const orderIds: string[] = [];
  try {
    const { orderA, orderB } = await runTest(customerCookie, adminCookie, adminUser.id);
    orderIds.push(orderA, orderB);
  } catch (err) {
    testError = err;
    // Best-effort recovery of whatever orders this run did manage to create,
    // so cleanup (including stock restoration) can still find and reverse
    // them even though runTest() threw before returning their ids normally.
    const partialOrders = await prisma.order.findMany({ where: { customerEmail: CUSTOMER_EMAIL }, select: { id: true } });
    orderIds.push(...partialOrders.map((o) => o.id));
  }

  let cleanupError: unknown = null;
  if (!KEEP) {
    try {
      await cleanup(orderIds, adminCookie);
    } catch (err) {
      cleanupError = err;
    }
  } else {
    log("Cleanup skipped (--keep)", { CUSTOMER_EMAIL, orderIds });
  }

  if (testError) console.error("\n❌ Simulation failed:", testError);
  if (cleanupError) console.error("\n❌ CLEANUP FAILED — state may be inconsistent, manual review required:", cleanupError);
  if (testError || cleanupError) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("\n❌ Unexpected top-level failure:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
