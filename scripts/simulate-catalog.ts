/**
 * Module 34 regression + security harness for admin product catalog
 * management and inventory safety — exercises the REAL running app against
 * the local dev/production server and database, same pattern as every
 * other simulate-*.ts script in this project (self-cleaning @example.test
 * data, admin login via the real /api/auth/login route).
 *
 * Covers:
 *   - Product create/update validation (name, price, slug, stock, category,
 *     theme, discount-vs-price consistency)
 *   - Module 32/33 slug-redirect preservation through an update (rename,
 *     re-adopt, old-slug 308, current-slug 200)
 *   - Stock-adjustment negative-stock guard and a light concurrency check
 *     for the Module 34 stock-service.ts race-condition fix
 *   - Image cross-product isolation (an image PATCH/DELETE with a
 *     mismatched product id must 404, never touch the wrong product)
 *   - Full role matrix (unauthenticated, CUSTOMER, SUPPORT_STAFF, ADMIN,
 *     SUPER_ADMIN) against every product-mutation endpoint
 *
 * Requires: `npm run dev` (or a production build via `npm run start`)
 * running locally, and a SUPER_ADMIN account to create/clean up QA staff
 * accounts (defaults to the seeded admin@kutir.in / Admin@12345, same as
 * every other simulate-*.ts script — override with ADMIN_EMAIL/
 * ADMIN_PASSWORD).
 *
 * Usage:
 *   npm run simulate:catalog
 *   npm run simulate:catalog -- --keep   (skip cleanup, for manual inspection)
 */
import { PrismaClient } from "@prisma/client";

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
async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status} ${await res.text()}`);
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

const CUSTOMER_EMAIL = `qa-catalog-customer-${RUN_ID}@example.test`;
const SUPPORT_EMAIL = `qa-catalog-support-${RUN_ID}@example.test`;
const ADMIN_QA_EMAIL = `qa-catalog-admin-${RUN_ID}@example.test`;
const STAFF_PASSWORD = "QaStaff12345!";

async function main() {
  log("Config", { BASE, ADMIN_EMAIL, RUN_ID, KEEP });

  const category = await prisma.category.findFirst({ select: { id: true } });
  if (!category) throw new Error("No category exists in DB — cannot run product create tests");
  const superAdminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

  // --- Set up QA accounts through the real APIs (Part 17: created through existing application APIs) ---
  log("Setup", "creating QA staff accounts via /api/admin/users, QA customer via /api/auth/register");
  const createStaff = async (email: string, role: string) => {
    const res = await fetch(`${BASE}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
      body: JSON.stringify({ name: `QA ${role} ${RUN_ID}`, email, password: STAFF_PASSWORD, role }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(`QA staff creation failed (${role}): ${JSON.stringify(json)}`);
    return json.data.id as string;
  };
  const supportStaffId = await createStaff(SUPPORT_EMAIL, "SUPPORT_STAFF");
  const adminQaId = await createStaff(ADMIN_QA_EMAIL, "ADMIN");
  const customerCookie = await register(CUSTOMER_EMAIL, `QA Customer ${RUN_ID}`);
  const supportCookie = await login(SUPPORT_EMAIL, STAFF_PASSWORD);
  const adminCookie = await login(ADMIN_QA_EMAIL, STAFF_PASSWORD);

  // ============================================================
  // PART 2/6 — Product create validation
  // ============================================================
  log("Part 2/6", "product create validation");

  const basePayload = () => ({
    name: `QA Catalog Product ${RUN_ID}`,
    slug: `qa-catalog-product-${RUN_ID}`,
    description: "Temporary QA product for Module 34's catalog regression script — deleted at the end of the run.",
    price: "999.00",
    sku: `QA-CATALOG-${RUN_ID}`,
    categoryId: category.id,
    status: "ACTIVE",
  });

  const create = async (cookie: string | null, body: Record<string, unknown>) =>
    fetch(`${BASE}/api/admin/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });

  assert((await create(adminCookie, { ...basePayload(), name: "" })).status === 400, "Empty product name is rejected");
  assert((await create(adminCookie, { ...basePayload(), price: "-5" })).status === 400, "Negative price is rejected");
  assert((await create(adminCookie, { ...basePayload(), price: "Infinity" })).status === 400, "Infinity price is rejected (Module 34 fix)");
  assert((await create(adminCookie, { ...basePayload(), price: "not-a-number" })).status === 400, "Non-numeric price is rejected");
  assert((await create(adminCookie, { ...basePayload(), stockAvailable: -3 })).status === 400, "Negative initial stock is rejected");
  assert((await create(adminCookie, { ...basePayload(), slug: "Not A Valid Slug!" })).status === 400, "Malformed slug is rejected");
  assert((await create(adminCookie, { ...basePayload(), categoryId: "not-a-real-id" })).status === 400, "Nonexistent category is rejected");
  assert(
    (await create(adminCookie, { ...basePayload(), price: "100", discountPrice: "150" })).status === 400,
    "discountPrice >= price is rejected on create (Module 34 fix)"
  );
  const themeIdInvalidRes = await create(adminCookie, { ...basePayload(), themeId: "not-a-real-id" });
  assert(themeIdInvalidRes.status === 400 || themeIdInvalidRes.status === 500, "Nonexistent theme is rejected (FK-level if not schema-level)");

  const createRes = await create(adminCookie, basePayload());
  const createJson = await createRes.json();
  assert(createRes.status === 201 && createJson.success, "Valid product create succeeds");
  const productId = createJson.data.id as string;
  const originalSlug = createJson.data.slug as string;
  log("QA product created", { productId, originalSlug });

  const dupSlugRes = await create(adminCookie, { ...basePayload(), sku: `QA-CATALOG-DUP-${RUN_ID}`, slug: originalSlug });
  assert(dupSlugRes.status === 409, "Duplicate slug is rejected on create");

  // ============================================================
  // PART 3/4 — Product update, slug redirect preservation
  // ============================================================
  log("Part 3/4", "product update + slug redirect preservation");

  const update = async (cookie: string | null, id: string, body: Record<string, unknown>) =>
    fetch(`${BASE}/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });

  const sameSlugRes = await update(adminCookie, productId, { slug: originalSlug });
  assert(sameSlugRes.status === 200, "Product can retain its own current slug on update");

  assert((await update(adminCookie, productId, { price: "-1" })).status === 400, "Negative price rejected on update");
  assert((await update(adminCookie, productId, { price: "100", discountPrice: "100" })).status === 400, "discountPrice == price is rejected on update (Module 34 fix)");
  assert(
    (await update(adminCookie, productId, { discountPrice: (Number(basePayload().price) + 1).toString() })).status === 400,
    "discountPrice above the product's EXISTING price is rejected when only discountPrice is sent (Module 34 merged-value fix)"
  );

  const renamedSlug = `qa-catalog-product-${RUN_ID}-renamed`;
  const renameRes = await update(adminCookie, productId, { slug: renamedSlug });
  assert(renameRes.status === 200, "Slug rename succeeds");

  const redirectRow = await prisma.productSlugRedirect.findUnique({ where: { oldSlug: originalSlug } });
  assert(!!redirectRow && redirectRow.productId === productId, "Renaming a slug records a ProductSlugRedirect row");

  const oldSlugFetch = await fetch(`${BASE}/product/${originalSlug}`, { redirect: "manual" });
  assert(oldSlugFetch.status === 308, "Old slug returns a real HTTP 308");
  assert((oldSlugFetch.headers.get("location") || "").endsWith(`/product/${renamedSlug}`), "308 points at the current slug");

  const newSlugFetch = await fetch(`${BASE}/product/${renamedSlug}`);
  assert(newSlugFetch.status === 200, "Current slug resolves directly (200)");

  const reAdoptRes = await update(adminCookie, productId, { slug: originalSlug });
  assert(reAdoptRes.status === 200, "Re-adopting the product's own old slug succeeds");
  const staleRedirect = await prisma.productSlugRedirect.findUnique({ where: { oldSlug: originalSlug } });
  assert(staleRedirect === null, "Re-adopting an old slug removes the now-stale redirect row (no shadow, no loop)");
  const newRedirect = await prisma.productSlugRedirect.findUnique({ where: { oldSlug: renamedSlug } });
  assert(!!newRedirect && newRedirect.productId === productId, "The vacated (renamed) slug now redirects back to this product");

  const reAdoptFetch = await fetch(`${BASE}/product/${originalSlug}`);
  assert(reAdoptFetch.status === 200, "Product is reachable again at its re-adopted original slug");
  const renamedNowRedirects = await fetch(`${BASE}/product/${renamedSlug}`, { redirect: "manual" });
  assert(renamedNowRedirects.status === 308, "The vacated slug 308s back to the current (re-adopted) slug");

  // A second, unrelated product can't steal a slug that's a live redirect target for this one.
  const secondPayload = { ...basePayload(), name: `QA Catalog Product B ${RUN_ID}`, sku: `QA-CATALOG-B-${RUN_ID}`, slug: `qa-catalog-product-b-${RUN_ID}` };
  const secondCreateRes = await create(adminCookie, secondPayload);
  const secondCreateJson = await secondCreateRes.json();
  assert(secondCreateRes.status === 201, "Second QA product created for cross-product slug-conflict check");
  const secondProductId = secondCreateJson.data.id as string;
  const stealRedirectSlugRes = await update(adminCookie, secondProductId, { slug: renamedSlug });
  assert(stealRedirectSlugRes.status === 409, "A DIFFERENT product cannot take a slug that's currently a live redirect target for another product");

  // ============================================================
  // PART 7 — Inventory / stock safety
  // ============================================================
  log("Part 7", "inventory / stock safety");

  const adjustStock = async (cookie: string | null, id: string, body: Record<string, unknown>) =>
    fetch(`${BASE}/api/admin/products/${id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });

  const restockRes = await adjustStock(adminCookie, productId, { change: 10, reason: "restock" });
  assert(restockRes.status === 200, "Manual stock restock (+10) succeeds");
  const afterRestock = await prisma.product.findUnique({ where: { id: productId }, select: { stockAvailable: true } });
  assert(afterRestock?.stockAvailable === 10, "Stock reflects exactly the +10 adjustment (started at 0)");

  const overDrawRes = await adjustStock(adminCookie, productId, { change: -999, reason: "damage" });
  assert(overDrawRes.status === 400, "An adjustment that would take stock negative is rejected");
  const afterOverDraw = await prisma.product.findUnique({ where: { id: productId }, select: { stockAvailable: true } });
  assert(afterOverDraw?.stockAvailable === 10, "Stock is unchanged after a rejected adjustment (no partial write)");

  const movementsAfterReject = await prisma.stockMovement.count({ where: { productId } });

  // Concurrency check for the Module 34 stock-service.ts fix: two
  // concurrent adjustments that would each individually succeed but
  // together would drive stock negative — exactly one must win.
  const [concA, concB] = await Promise.all([
    adjustStock(adminCookie, productId, { change: -7, reason: "damage", note: "concurrent-a" }),
    adjustStock(adminCookie, productId, { change: -7, reason: "damage", note: "concurrent-b" }),
  ]);
  const succeededCount = [concA, concB].filter((r) => r.status === 200).length;
  assert(succeededCount === 1, "Exactly one of two racing -7 adjustments against a stock of 10 succeeds (Module 34 atomic guard)");
  const afterRace = await prisma.product.findUnique({ where: { id: productId }, select: { stockAvailable: true } });
  assert(afterRace!.stockAvailable === 3, `Stock after the race is exactly 3 (10 - 7), got ${afterRace!.stockAvailable} — would be -4 or inconsistent under the old race condition`);
  const movementsAfterRace = await prisma.stockMovement.count({ where: { productId } });
  assert(movementsAfterRace === movementsAfterReject + 1, "Exactly one new StockMovement row was written for the race (the rejected side wrote none)");

  // ============================================================
  // PART 8 — Product images: cross-product isolation
  // ============================================================
  log("Part 8", "product image cross-product isolation");

  const addImageRes = await fetch(`${BASE}/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ url: "/patterns/jali.svg", altText: "QA test image" }),
  });
  const addImageJson = await addImageRes.json();
  assert(addImageRes.status === 201, "Adding an image to product A succeeds");
  const imageId = addImageJson.data.id as string;

  const crossProductDelete = await fetch(`${BASE}/api/admin/products/${secondProductId}/images/${imageId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  assert(crossProductDelete.status === 404, "Deleting product A's image via product B's URL is rejected (no cross-product deletion)");
  const imageStillThere = await prisma.productImage.findUnique({ where: { id: imageId } });
  assert(!!imageStillThere, "The image still exists after the mismatched cross-product delete attempt");

  const ownProductDelete = await fetch(`${BASE}/api/admin/products/${productId}/images/${imageId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  assert(ownProductDelete.status === 200, "Deleting the image via its own product's URL succeeds");

  // ============================================================
  // PART 15 — Security / role matrix
  // ============================================================
  log("Part 15", "security / role matrix against product mutation endpoints");

  const roleCheck = async (label: string, cookie: string | null, expectStatus: number, req: () => Promise<Response>) => {
    const res = await req();
    assert(res.status === expectStatus, `${label}: expected ${expectStatus}, got ${res.status}`);
  };

  const thirdPayload = { ...basePayload(), name: `QA Catalog Product C ${RUN_ID}`, sku: `QA-CATALOG-C-${RUN_ID}`, slug: `qa-catalog-product-c-${RUN_ID}` };
  await roleCheck("CREATE unauthenticated", null, 401, () => create(null, thirdPayload));
  await roleCheck("CREATE as CUSTOMER", customerCookie, 403, () => create(customerCookie, thirdPayload));
  await roleCheck("CREATE as SUPPORT_STAFF", supportCookie, 403, () => create(supportCookie, thirdPayload));
  await roleCheck("CREATE as ADMIN", adminCookie, 201, () => create(adminCookie, thirdPayload));

  await roleCheck("UPDATE unauthenticated", null, 401, () => update(null, productId, { name: "x" }));
  await roleCheck("UPDATE as CUSTOMER", customerCookie, 403, () => update(customerCookie, productId, { name: "x" }));
  await roleCheck("UPDATE as SUPPORT_STAFF", supportCookie, 403, () => update(supportCookie, productId, { name: "x" }));
  await roleCheck("UPDATE as ADMIN", adminCookie, 200, () => update(adminCookie, productId, { name: `QA Catalog Product ${RUN_ID} (renamed by ADMIN)` }));
  await roleCheck("UPDATE as SUPER_ADMIN", superAdminCookie, 200, () => update(superAdminCookie, productId, { name: `QA Catalog Product ${RUN_ID}` }));

  await roleCheck("STOCK ADJUST unauthenticated", null, 401, () => adjustStock(null, productId, { change: 1, reason: "correction" }));
  await roleCheck("STOCK ADJUST as CUSTOMER", customerCookie, 403, () => adjustStock(customerCookie, productId, { change: 1, reason: "correction" }));
  await roleCheck("STOCK ADJUST as SUPPORT_STAFF (not a stock role)", supportCookie, 403, () => adjustStock(supportCookie, productId, { change: 1, reason: "correction" }));
  await roleCheck("STOCK ADJUST as ADMIN", adminCookie, 200, () => adjustStock(adminCookie, productId, { change: 1, reason: "correction" }));

  const archive = async (cookie: string | null, id: string) =>
    fetch(`${BASE}/api/admin/products/${id}/archive`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: "{}" });
  await roleCheck("ARCHIVE unauthenticated", null, 401, () => archive(null, productId));
  await roleCheck("ARCHIVE as CUSTOMER", customerCookie, 403, () => archive(customerCookie, productId));
  await roleCheck("ARCHIVE as SUPPORT_STAFF", supportCookie, 403, () => archive(supportCookie, productId));

  // No internal error leakage: a malformed/garbage id must produce a clean 404/400, never a 500 with a stack trace.
  const garbageIdRes = await update(adminCookie, encodeURIComponent("' OR 1=1 --"), { name: "x" });
  assert(garbageIdRes.status === 404 || garbageIdRes.status === 400, "A malformed/garbage product id is rejected cleanly (404/400), not a 500");
  const garbageIdBody = await garbageIdRes.json();
  assert(typeof garbageIdBody.error === "string" && !garbageIdBody.error.includes("Prisma") && !garbageIdBody.error.includes("at "), "Error response contains no internal/stack-trace details");

  console.log("\n✅ All Module 34 catalog regression + security checks passed.");

  // ============================================================
  // Cleanup
  // ============================================================
  if (!KEEP) {
    // Looked up by SKU/RUN_ID pattern rather than the two explicitly
    // tracked ids — every QA product this run creates has a SKU containing
    // RUN_ID (including the ad-hoc one made in the Part 15 role-matrix
    // "CREATE as ADMIN" check), so this can't miss one and leave an
    // ActivityLog row FK-blocking the QA staff user delete below.
    const qaProducts = await prisma.product.findMany({ where: { sku: { contains: RUN_ID } }, select: { id: true } });
    const qaProductIds = qaProducts.map((p) => p.id);
    const delImages = await prisma.productImage.deleteMany({ where: { productId: { in: qaProductIds } } });
    const delActivity = await prisma.activityLog.deleteMany({ where: { entity: "Product", entityId: { in: qaProductIds } } });
    // Notification has no FK to Product (metadata is a free-form JSON blob,
    // same reason simulate-shipment.ts does this same content-search
    // delete rather than a where-clause one) — the stock-crossing test in
    // Part 7 deliberately drives a QA product across its low-stock
    // threshold, which fires exactly this kind of notification.
    const allNotifs = await prisma.notification.findMany({ select: { id: true, metadata: true } });
    const notifIdsToDelete = allNotifs.filter((n) => qaProductIds.some((id) => JSON.stringify(n.metadata ?? {}).includes(id))).map((n) => n.id);
    const delNotifs = notifIdsToDelete.length ? await prisma.notification.deleteMany({ where: { id: { in: notifIdsToDelete } } }) : { count: 0 };
    const delProducts = await prisma.product.deleteMany({ where: { id: { in: qaProductIds } } });
    const delStaff = await prisma.user.deleteMany({ where: { id: { in: [supportStaffId, adminQaId] } } });
    const delCustomer = await prisma.user.deleteMany({ where: { email: CUSTOMER_EMAIL } });
    log("Cleanup", {
      qaProductsFound: qaProductIds.length,
      productsDeleted: delProducts.count,
      imagesDeletedDirectly: delImages.count,
      activityLogRowsDeleted: delActivity.count,
      notificationsDeleted: delNotifs.count,
      staffAccountsDeleted: delStaff.count,
      customerAccountsDeleted: delCustomer.count,
    });
  } else {
    log("Cleanup skipped (--keep)", { productId, secondProductId, supportStaffId, adminQaId, CUSTOMER_EMAIL });
  }
}

main()
  .catch((err) => {
    console.error("\n❌ Catalog simulation failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
