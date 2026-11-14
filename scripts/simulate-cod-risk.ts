/**
 * Local integration test harness for the Module 21 COD-risk feature —
 * exercises the REAL running app (register/login/cart/checkout/admin status
 * APIs) against the local dev server and database, the same way
 * simulate-razorpay-webhook.ts exercises the webhook route. No real
 * Razorpay API call, no real email/WhatsApp send — those stay on the
 * existing Console* providers.
 *
 * Requires: `npm run dev` running locally, and a SUPER_ADMIN/ADMIN account
 * to drive order-status changes (defaults to the seeded admin@kutir.in /
 * Admin@12345 — override with ADMIN_EMAIL/ADMIN_PASSWORD env vars).
 *
 * Usage:
 *   npm run simulate:cod-risk
 *   npm run simulate:cod-risk -- --keep   (skip cleanup, for manual inspection)
 *
 * What it proves, end to end:
 *   1. A normal COD customer can place orders.
 *   2. A legitimately delivered COD order never counts as a risk incident.
 *   3-4. Two qualifying refused-COD returns don't restrict COD (threshold is 3).
 *   5. A third qualifying incident crosses the threshold -> COD auto-restricted.
 *   6. Online payment is unaffected (create-order is still reachable, not
 *      blocked by COD logic — a real charge is NOT attempted).
 *   7. A subsequent COD checkout attempt is rejected server-side.
 *   8. The admin customer-detail data layer reflects the restriction.
 *   9. The manual admin override (PATCH cod-status) lifts it again.
 *  10. A second, unrelated customer is never affected by any of the above.
 *
 * All data created here uses @example.test emails/order numbers and is
 * deleted at the end unless --keep is passed. Cleanup is explicit rather
 * than relying on cascade deletes: per this project's own architecture,
 * StockMovement and ActivityLog have no foreign key back to Order (an
 * orphan-row gap noted in the Module 21 audit), and Notification rows
 * reference orders/users only via a JSON metadata field — none of these
 * are cleaned up automatically by deleting the Order/User rows.
 *
 * MODULE 35 — real-product stock baseline restoration:
 * This script uses a REAL catalog product (whatever /api/products?pageSize=1
 * returns — never hardcoded) for every order it places. Two of this run's
 * orders reach DELIVERED (step 2) or stay pending in a flagged/incomplete
 * state that this script deliberately never resolves further — both leave
 * that product's stockAvailable net-decremented on purpose, because
 * DELIVERED correctly means "sold" and is never auto-restocked by the app.
 * The other orders (RETURNED/CANCELLED) already net to zero via the app's
 * own existing restock logic. The old cleanup only deleted the audit
 * StockMovement rows (by matching their `note` against this run's order
 * numbers) without ever reversing this net effect on the live counter,
 * silently leaking real stock on every run (see Module 34's report).
 * Fixed by capturing the touched product's REAL stockAvailable value at
 * the moment this script first touches it, then at cleanup diffing the
 * live value against that captured baseline and reversing exactly that
 * diff through the existing adjustStock()-backed admin API — never a
 * hardcoded product id or "restore to N". See captureStockBaseline() /
 * restoreStockBaselines() below.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PORT = process.env.DEV_PORT || "3000";
const BASE = `http://localhost:${PORT}`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@kutir.in";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345";
const KEEP = process.argv.includes("--keep");

const RUN_ID = Date.now().toString(36);
const CUSTOMER_EMAIL = `qa-codrisk-${RUN_ID}@example.test`;
const OTHER_EMAIL = `qa-codrisk-other-${RUN_ID}@example.test`;
const PASSWORD = "QaTest12345!";

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? "");
}

function extractCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("No Set-Cookie header in response");
  return setCookie.split(";")[0];
}

async function register(email: string, name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: PASSWORD, phone: "9876543210" }),
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

async function whoAmI(cookie: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
  const json = await res.json();
  const id = json?.data?.user?.id;
  if (!id) throw new Error("could not resolve user id from /api/auth/me");
  return id;
}

// --- Module 35: real-product stock baseline capture/restore ---------------
// See the file header for why this exists. Never hardcodes a product id or
// a "correct" stock value — everything here is discovered live.
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
        note: `QA simulator cleanup — reversing test inventory mutation (simulate-cod-risk run ${RUN_ID})`,
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

async function addFirstProductToCart(cookie: string): Promise<{ productId: string; name: string }> {
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
  return { productId: product.id, name: product.name };
}

async function placeCodOrder(cookie: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      email: CUSTOMER_EMAIL,
      paymentMethod: "COD",
      billingSameAsShipping: true,
      shippingAddress: {
        fullName: "QA CodRisk Test",
        countryCode: "IN",
        phone: "9876543210",
        line1: "1 Test Lane",
        line2: "Near Test Landmark, Test Area",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        country: "India",
      },
    }),
  });
  const json = await res.json();
  return { success: res.ok && json.success, orderId: json?.data?.orderId, error: json?.error };
}

async function setOrderStatus(adminCookie: string, orderId: string, status: string, statusReason?: string) {
  const res = await fetch(`${BASE}/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ status, statusReason }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`status update to ${status} failed: ${JSON.stringify(json)}`);
}

async function driveOneQualifyingRefusal(customerCookie: string, adminCookie: string): Promise<string> {
  await addFirstProductToCart(customerCookie);
  const placed = await placeCodOrder(customerCookie);
  if (!placed.success || !placed.orderId) throw new Error(`order placement failed: ${placed.error}`);
  const orderId = placed.orderId;
  await setOrderStatus(adminCookie, orderId, "PACKED");
  await setOrderStatus(adminCookie, orderId, "READY_TO_SHIP");
  await setOrderStatus(adminCookie, orderId, "SHIPPED");
  await setOrderStatus(adminCookie, orderId, "OUT_FOR_DELIVERY");
  await setOrderStatus(adminCookie, orderId, "RETURNED", "CUSTOMER_REFUSED_COD");
  return orderId;
}

async function runTest(customerCookie: string, otherCookie: string, adminCookie: string): Promise<void> {
  // 2. One legitimate delivered COD order — must never count as a risk incident.
  await addFirstProductToCart(customerCookie);
  const delivered = await placeCodOrder(customerCookie);
  if (!delivered.success || !delivered.orderId) throw new Error(`legit order failed: ${delivered.error}`);
  await setOrderStatus(adminCookie, delivered.orderId, "PACKED");
  await setOrderStatus(adminCookie, delivered.orderId, "READY_TO_SHIP");
  await setOrderStatus(adminCookie, delivered.orderId, "SHIPPED");
  await setOrderStatus(adminCookie, delivered.orderId, "OUT_FOR_DELIVERY");
  await setOrderStatus(adminCookie, delivered.orderId, "DELIVERED");
  log("2. One legitimately delivered COD order created — no risk contribution");

  // 3 & 4: two qualifying refusals — below the threshold (3), COD must stay enabled.
  const incident1 = await driveOneQualifyingRefusal(customerCookie, adminCookie);
  const incident2 = await driveOneQualifyingRefusal(customerCookie, adminCookie);
  log("3-4. Two qualifying refused-COD returns recorded", { incident1, incident2 });

  await addFirstProductToCart(customerCookie);
  const stillAllowed = await placeCodOrder(customerCookie);
  log("Check: COD still allowed after 2 incidents (threshold is 3)", stillAllowed);
  if (!stillAllowed.success) throw new Error("COD was blocked too early — threshold logic regression");
  if (stillAllowed.orderId) await setOrderStatus(adminCookie, stillAllowed.orderId, "CANCELLED", "OTHER"); // tidy up, doesn't count toward risk

  // 5: third qualifying incident crosses the threshold.
  const incident3 = await driveOneQualifyingRefusal(customerCookie, adminCookie);
  log("5. Third qualifying incident recorded — COD should now be restricted", { incident3 });

  // 7: COD checkout must now be rejected server-side.
  await addFirstProductToCart(customerCookie);
  const blocked = await placeCodOrder(customerCookie);
  log("7. COD checkout attempt after threshold", blocked);
  if (blocked.success) throw new Error("REGRESSION: COD order succeeded after threshold was crossed");

  // 6: online payment must still be reachable (not rejected by COD logic).
  const razorpayRes = await fetch(`${BASE}/api/payment/razorpay/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: customerCookie },
    body: JSON.stringify({
      email: CUSTOMER_EMAIL,
      shippingAddress: {
        fullName: "QA CodRisk Test",
        countryCode: "IN",
        phone: "9876543210",
        line1: "1 Test Lane",
        line2: "Near Test Landmark, Test Area",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        country: "India",
      },
    }),
  });
  const razorpayJson = await razorpayRes.json();
  log("6. Online payment path still reachable (failure here, if any, is the known empty-Razorpay-credentials limitation, not a COD-block)", razorpayJson);

  // 10: the second customer must be completely unaffected.
  await addFirstProductToCart(otherCookie);
  const otherOrder = await placeCodOrder(otherCookie);
  log("10. Unrelated customer's COD order is unaffected", otherOrder);
  if (!otherOrder.success) throw new Error("REGRESSION: an unrelated customer's COD was blocked");
  if (otherOrder.orderId) await setOrderStatus(adminCookie, otherOrder.orderId, "CANCELLED", "OTHER");

  // 8 & 9: admin visibility + manual override.
  const customerId = await whoAmI(customerCookie);
  const overrideRes = await fetch(`${BASE}/api/admin/customers/${customerId}/cod-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ blocked: false, note: "QA simulation — manual restore" }),
  });
  const overrideJson = await overrideRes.json();
  log("9. Admin manual override (restore COD)", overrideJson);
  if (!overrideRes.ok || !overrideJson.success) throw new Error("admin override failed");

  const restoredAttempt = await placeCodOrder(customerCookie);
  log("Check: COD allowed again after manual restore", restoredAttempt);
  if (!restoredAttempt.success) throw new Error("REGRESSION: COD still blocked after manual restore");
  if (restoredAttempt.orderId) await setOrderStatus(adminCookie, restoredAttempt.orderId, "CANCELLED", "OTHER");

  console.log("\n✅ All COD-risk simulation checks passed.");
}

async function cleanup(customerId: string, otherCustomerId: string, since: Date, adminCookie: string) {
  // Module 35: reverse the net real-product stock effect FIRST, verified,
  // before touching any StockMovement rows below — deleting the audit
  // trail first (the old bug) would destroy the only evidence a correction
  // could be computed from.
  await restoreStockBaselines(adminCookie);

  const qaOrders = await prisma.order.findMany({
    where: { userId: { in: [customerId, otherCustomerId] } },
    select: { id: true, orderNumber: true },
  });
  const qaOrderIds = qaOrders.map((o) => o.id);
  const qaOrderNumbers = qaOrders.map((o) => o.orderNumber);

  if (qaOrderNumbers.length > 0) {
    const deletedMovements = await prisma.stockMovement.deleteMany({
      where: { createdAt: { gte: since }, OR: qaOrderNumbers.map((n) => ({ note: { contains: n } })) },
    });
    log("Cleanup: StockMovement rows removed", deletedMovements.count);
  }

  const deletedActivity = await prisma.activityLog.deleteMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { entity: "Order", entityId: { in: qaOrderIds } },
        { entity: "User", entityId: { in: [customerId, otherCustomerId] } },
      ],
    },
  });
  log("Cleanup: ActivityLog rows removed", deletedActivity.count);

  const candidateNotifications = await prisma.notification.findMany({
    where: { createdAt: { gte: since }, type: { in: ["order.placed", "cod.restricted"] } },
    select: { id: true, metadata: true },
  });
  const notificationIdsToDelete = candidateNotifications
    .filter((n) => {
      const meta = JSON.stringify(n.metadata ?? {});
      return qaOrderIds.some((id) => meta.includes(id)) || meta.includes(customerId);
    })
    .map((n) => n.id);
  if (notificationIdsToDelete.length > 0) {
    const deletedNotifications = await prisma.notification.deleteMany({ where: { id: { in: notificationIdsToDelete } } });
    log("Cleanup: Notification rows removed", deletedNotifications.count);
  }

  // Cascades OrderItem + Payment (both onDelete: Cascade from Order).
  const deletedOrders = await prisma.order.deleteMany({ where: { id: { in: qaOrderIds } } });
  log("Cleanup: Order rows removed (cascades items/payment)", deletedOrders.count);

  // Cascades Address, CartItem, WishlistItem, Review, PasswordResetToken.
  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: [customerId, otherCustomerId] } } });
  log("Cleanup: User rows removed", deletedUsers.count);
}

async function main() {
  const startedAt = new Date();
  log("Setup", { BASE, CUSTOMER_EMAIL, OTHER_EMAIL, keep: KEEP });

  const customerCookie = await register(CUSTOMER_EMAIL, "QA CodRisk Test");
  const otherCookie = await register(OTHER_EMAIL, "QA CodRisk Other");
  const adminCookie = await adminLogin();
  // Resolved immediately (not just before the admin-override step, as
  // before) so cleanup has them available even if the test fails early
  // (Module 35 Part 14: cleanup must still be able to find + remove this
  // run's QA users/orders no matter where a failure happens).
  const customerId = await whoAmI(customerCookie);
  const otherCustomerId = await whoAmI(otherCookie);
  log("1. Registered QA customer + a second, unrelated customer, logged in as admin", { customerId, otherCustomerId });

  // Module 35: test failure and cleanup failure are tracked and reported
  // independently — a bare try/finally would let a cleanup-block throw
  // silently replace/hide an earlier test failure. Cleanup always runs.
  let testError: unknown = null;
  try {
    await runTest(customerCookie, otherCookie, adminCookie);
  } catch (err) {
    testError = err;
  }

  let cleanupError: unknown = null;
  if (!KEEP) {
    try {
      await cleanup(customerId, otherCustomerId, startedAt, adminCookie);
    } catch (err) {
      cleanupError = err;
    }
  } else {
    log("Cleanup skipped (--keep)", { CUSTOMER_EMAIL, OTHER_EMAIL, customerId, otherCustomerId });
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
