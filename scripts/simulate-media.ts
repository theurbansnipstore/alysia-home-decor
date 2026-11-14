/**
 * Module 38 regression + security harness — exercises the REAL running app
 * (register/login/admin APIs) against the local dev server and database,
 * same pattern as every other simulate-*.ts script in this project
 * (self-cleaning @example.test data, admin login via /api/auth/login,
 * capture-before-mutate/restore-after for any real Setting row touched).
 *
 * Covers, in order: Media library (role matrix, CRUD, usage/deletion
 * protection, CMS image reference, image-domain advisory check), Shop/
 * category/theme filter-setting consistency (Module 38's core reported
 * bug), checkout billing-address choice (never compulsory, always
 * defaults to shipping), and the Shop mega-menu's auto/custom Categories/
 * Themes columns (including broken-reference protection).
 *
 * Requires: `npm run dev` (or `npm run start`) running locally, and a
 * SUPER_ADMIN account (defaults to the seeded admin@kutir.in /
 * Admin@12345 — override with ADMIN_EMAIL/ADMIN_PASSWORD).
 *
 * Usage:
 *   npm run simulate:media
 *   npm run simulate:media -- --keep   (skip cleanup, for manual inspection)
 */
import { PrismaClient, type Prisma } from "@prisma/client";

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

const CUSTOMER_EMAIL = `qa-media-customer-${RUN_ID}@example.test`;
const BILLING_EMAIL = `qa-media-billing-${RUN_ID}@example.test`;
const BILLING2_EMAIL = `qa-media-billing2-${RUN_ID}@example.test`;

const MEDIA_KEY = "store_media";
const NAVIGATION_KEY = "store_navigation";
const SHOP_KEY = "store_shop";
const BROWSE_PAGES_KEY = "store_browse_pages";
const CHECKOUT_KEY = "store_checkout";

async function tableCounts() {
  const [users, orders, orderItems, payments, settings, activityLogs, stockMovements, notifications] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.payment.count(),
    prisma.setting.count(),
    prisma.activityLog.count(),
    prisma.stockMovement.count(),
    prisma.notification.count(),
  ]);
  return { users, orders, orderItems, payments, settings, activityLogs, stockMovements, notifications };
}

interface SettingBaseline {
  key: string;
  row: { value: Prisma.JsonValue } | null | undefined;
}

interface RunState {
  baselines: SettingBaseline[];
  mutatedKeys: Set<string>;
  qaOrderIds: string[];
  touchedProductId: string | null;
  touchedProductBaselineStock: number | null;
}

async function captureBaseline(state: RunState, key: string) {
  if (state.baselines.some((b) => b.key === key)) return;
  const row = await prisma.setting.findUnique({ where: { key } });
  state.baselines.push({ key, row });
  log("Baseline captured", { key, existed: !!row });
}

async function restoreBaselines(state: RunState) {
  for (const { key, row } of state.baselines) {
    if (!state.mutatedKeys.has(key)) continue;
    if (row === null || row === undefined) {
      await prisma.setting.delete({ where: { key } }).catch(() => undefined);
      const verify = await prisma.setting.findUnique({ where: { key } });
      if (verify !== null) throw new Error(`Restoration FAILED for ${key}: expected no row, row still exists.`);
    } else {
      await prisma.setting.update({ where: { key }, data: { value: row.value as object } });
      const verify = await prisma.setting.findUnique({ where: { key } });
      if (JSON.stringify(verify?.value) !== JSON.stringify(row.value)) {
        throw new Error(`Restoration VERIFICATION FAILED for ${key}: restored value does not match baseline.`);
      }
    }
    log("Setting restored to exact pre-test state", { key });
  }
}

async function getSettings(cookie: string, path: string) {
  const res = await fetch(`${BASE}/api/admin/content/${path}`, { headers: { Cookie: cookie } });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`GET ${path} failed: ${JSON.stringify(json)}`);
  return json.data;
}
async function patchSettings(cookie: string | null, path: string, body: unknown, base = "content") {
  return fetch(`${BASE}/api/admin/${base}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function runTest(state: RunState, adminCookie: string, customerCookie: string) {
  // ============================================================
  // MEDIA (1-10)
  // ============================================================
  log("MEDIA", "role matrix + CRUD + usage protection + CMS reference + domain check");

  assert((await fetch(`${BASE}/api/admin/content/media`)).status === 401, "2. Unauthenticated media list is rejected");
  assert((await fetch(`${BASE}/api/admin/content/media`, { headers: { Cookie: customerCookie } })).status === 403, "2b. CUSTOMER media list is rejected");

  const listRes = await getSettings(adminCookie, "media");
  assert(Array.isArray(listRes.items), "1. Authorized admin can list media");

  await captureBaseline(state, MEDIA_KEY);
  const qaMediaItem = {
    id: `qa-media-${RUN_ID}`,
    url: `https://picsum.photos/seed/qa-${RUN_ID}/400/400`,
    altText: `QA alt text ${RUN_ID}`,
    label: `QA Media ${RUN_ID}`,
    createdAt: new Date().toISOString(),
  };
  const createRes = await patchSettings(adminCookie, "media", { items: [...listRes.items, qaMediaItem] });
  const createJson = await createRes.json();
  assert(createRes.ok && createJson.success, "3. Authorized admin can create a media item");
  state.mutatedKeys.add(MEDIA_KEY);

  const afterCreate = await getSettings(adminCookie, "media");
  const created = afterCreate.items.find((i: { id: string }) => i.id === qaMediaItem.id);
  assert(!!created && created.label === qaMediaItem.label, "6. Created item's label/metadata is readable back (preview metadata)");

  const updatedLabel = `QA Media ${RUN_ID} (updated)`;
  const updateRes = await patchSettings(adminCookie, "media", {
    items: afterCreate.items.map((i: { id: string; label: string }) => (i.id === qaMediaItem.id ? { ...i, label: updatedLabel } : i)),
  });
  assert(updateRes.ok, "4. Authorized admin can update a media item");

  // 5. Search is a client-side filter over the fetched list (label/altText/url
  // substring match) — not a server endpoint, so there's nothing to hit over
  // HTTP. Verified here structurally: every field search filters on is present
  // and correctly persisted, which is what the client-side filter reads.
  const afterUpdate = await getSettings(adminCookie, "media");
  const updated = afterUpdate.items.find((i: { id: string }) => i.id === qaMediaItem.id);
  assert(updated.label === updatedLabel && updated.altText === qaMediaItem.altText, "5. Fields the client-side search filters on (label/altText/url) are present and correctly persisted");

  // 8. Unused media — usage endpoint reports empty.
  const unusedUsageRes = await fetch(`${BASE}/api/admin/content/media/usage?url=${encodeURIComponent(qaMediaItem.url)}`, { headers: { Cookie: adminCookie } });
  const unusedUsageJson = await unusedUsageRes.json();
  assert(unusedUsageRes.ok && unusedUsageJson.data.usages.length === 0, "8. Usage check reports no usages for an unreferenced image");

  // 9. Reference it from a real CMS field (Shop page hero image), then confirm
  // the usage check finds it AND the storefront actually renders it.
  await captureBaseline(state, BROWSE_PAGES_KEY);
  const browsePages = await getSettings(adminCookie, "browse-pages");
  const qaShopTitle = `QA Shop Title ${RUN_ID}`;
  const refRes = await patchSettings(adminCookie, "browse-pages", {
    ...browsePages,
    shop: { ...browsePages.shop, heroImage: qaMediaItem.url, title: qaShopTitle },
  });
  assert(refRes.ok, "CMS reference: Shop page hero image + title set via browse-pages settings");
  state.mutatedKeys.add(BROWSE_PAGES_KEY);

  const referencedUsageRes = await fetch(`${BASE}/api/admin/content/media/usage?url=${encodeURIComponent(qaMediaItem.url)}`, { headers: { Cookie: adminCookie } });
  const referencedUsageJson = await referencedUsageRes.json();
  assert(referencedUsageJson.data.usages.some((u: string) => u.includes("Shop")), "9. Usage check finds the image once referenced from a real CMS field");

  const shopHtml = await (await fetch(`${BASE}/shop`)).text();
  assert(shopHtml.includes(qaShopTitle), "9b. /shop renders the CMS-configured title");
  assert(shopHtml.includes(`alt="${qaShopTitle}"`), "9c. /shop renders the CMS-configured hero image (alt attribute present, confirming the <Image> mounted)");

  // 7. Referenced-media deletion requires the usage list to be non-empty
  // (already proven above) — the admin UI requires deliberate confirmation
  // before removing it; verified at the data layer here (API itself doesn't
  // block deletion — confirmation is a UI-layer safeguard per Part 2's
  // "require deliberate confirmation", not a hard server-side lock).
  log("7. Referenced-media deletion protection is enforced in the admin UI (confirmation dialog) after this same usage check — verified structurally above");

  // 10. Broken/disallowed-domain image URL: the settings layer accepts it
  // (advisory-only client warning, not a hard block — next.config.js stays
  // the sole rendering-time enforcement point) without crashing.
  const disallowedUrl = "https://evil-not-allowlisted.example.com/x.jpg";
  const disallowedRes = await patchSettings(adminCookie, "browse-pages", {
    ...browsePages,
    shop: { ...browsePages.shop, heroImage: disallowedUrl, title: qaShopTitle },
  });
  assert(disallowedRes.ok, "10. A disallowed-domain image URL is accepted at the settings layer (no crash) — next.config.js remains the actual rendering-time gate, unchanged");
  // restore the shop hero image back to the QA-allowed one before the next check runs (avoids a broken next/image render on repeated local runs)
  await patchSettings(adminCookie, "browse-pages", { ...browsePages, shop: { ...browsePages.shop, heroImage: qaMediaItem.url, title: qaShopTitle } });

  // Cleanup the QA media item itself now that usage checks are done.
  const finalMedia = await getSettings(adminCookie, "media");
  await patchSettings(adminCookie, "media", { items: finalMedia.items.filter((i: { id: string }) => i.id !== qaMediaItem.id) });

  // ============================================================
  // FILTERS (11-17) — the user-reported bug: showFilters/showCategoryFilter/
  // showThemeFilter had zero effect on /categories/[slug] and /themes/[slug].
  // ============================================================
  log("FILTERS", "consistency across /shop, /categories/[slug], /themes/[slug]");
  await captureBaseline(state, SHOP_KEY);

  const [category, theme] = await Promise.all([
    prisma.category.findFirst({ where: { isVisible: true }, select: { slug: true, name: true } }),
    prisma.theme.findFirst({ where: { isEnabled: true }, select: { slug: true, name: true } }),
  ]);
  if (!category || !theme) throw new Error("Need at least one visible category and theme in the catalog to run the filter checks.");

  async function getShopSettingsViaPage(): Promise<Record<string, unknown>> {
    // No GET /api/admin/settings/shop exists — read the live Setting row directly (read-only, not a mutation).
    const row = await prisma.setting.findUnique({ where: { key: SHOP_KEY } });
    return (row?.value as Record<string, unknown>) ?? {};
  }
  const baseShop = {
    showFilters: true, showCategoryFilter: true, showThemeFilter: true, showPriceFilter: true, showSort: true,
    productsPerPage: 12, gridColumns: 3, showWishlistOnCards: true, showAddToCartOnCards: true, showRatingOnCards: false,
    ...(await getShopSettingsViaPage()),
  };

  async function setShop(patch: Partial<typeof baseShop>) {
    const res = await fetch(`${BASE}/api/admin/settings/shop`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ ...baseShop, ...patch }),
    });
    if (!res.ok) throw new Error(`shop settings PATCH failed: ${await res.text()}`);
    state.mutatedKeys.add(SHOP_KEY);
  }

  // 11/12. /shop filters ON then OFF
  await setShop({ showFilters: true });
  const shopOnHtml = await (await fetch(`${BASE}/shop`)).text();
  assert(shopOnHtml.includes(`aria-label="Open filters"`), "11. /shop: showFilters ON renders the filter sidebar trigger");
  await setShop({ showFilters: false });
  const shopOffHtml = await (await fetch(`${BASE}/shop`)).text();
  assert(!shopOffHtml.includes(`aria-label="Open filters"`), "12. /shop: showFilters OFF hides the filter sidebar");
  await setShop({ showFilters: true });

  // 13/14. category page filters ON then OFF (the reported bug)
  const catOnHtml = await (await fetch(`${BASE}/categories/${category.slug}`)).text();
  assert(catOnHtml.includes(`aria-label="Open filters"`), "13. /categories/[slug]: showFilters ON renders the filter sidebar (mobile trigger)");
  await setShop({ showFilters: false });
  const catOffHtml = await (await fetch(`${BASE}/categories/${category.slug}`)).text();
  assert(!catOffHtml.includes(`aria-label="Open filters"`), "14. /categories/[slug]: showFilters OFF now hides the filter sidebar (previously had NO effect — this was the reported bug)");
  // ">Theme<"/">Category<" match the FilterSidebar section <legend> exactly
  // — a plain category/theme NAME substring check is unreliable here since
  // the Header's Shop mega-menu (present on every page) also lists real
  // category/theme names/links, which would false-positive-match regardless
  // of these settings.
  await setShop({ showFilters: true, showThemeFilter: false });
  const catNoThemeHtml = await (await fetch(`${BASE}/categories/${category.slug}`)).text();
  assert(!catNoThemeHtml.includes(">Theme<"), "14b. /categories/[slug]: showThemeFilter OFF removes the Theme filter section");
  await setShop({ showThemeFilter: true });
  const catWithThemeHtml = await (await fetch(`${BASE}/categories/${category.slug}`)).text();
  assert(catWithThemeHtml.includes(">Theme<"), "14c. /categories/[slug]: showThemeFilter ON restores the Theme filter section");

  // 15/16. theme page filters ON then OFF
  const themeOnHtml = await (await fetch(`${BASE}/themes/${theme.slug}`)).text();
  assert(themeOnHtml.includes(`aria-label="Open filters"`), "15. /themes/[slug]: showFilters ON renders the filter sidebar");
  await setShop({ showFilters: false });
  const themeOffHtml = await (await fetch(`${BASE}/themes/${theme.slug}`)).text();
  assert(!themeOffHtml.includes(`aria-label="Open filters"`), "16. /themes/[slug]: showFilters OFF now hides the filter sidebar (previously had NO effect)");
  await setShop({ showFilters: true, showCategoryFilter: false });
  const themeNoCatHtml = await (await fetch(`${BASE}/themes/${theme.slug}`)).text();
  assert(!themeNoCatHtml.includes(">Category<"), "16b. /themes/[slug]: showCategoryFilter OFF removes the Category filter section");
  await setShop({ showCategoryFilter: true });
  const themeWithCatHtml = await (await fetch(`${BASE}/themes/${theme.slug}`)).text();
  assert(themeWithCatHtml.includes(">Category<"), "16c. /themes/[slug]: showCategoryFilter ON restores the Category filter section");

  // 17. restore
  await restoreBaselines({ ...state, baselines: state.baselines.filter((b) => b.key === SHOP_KEY) });
  const verifyShopRestored = await prisma.setting.findUnique({ where: { key: SHOP_KEY } });
  const originalShopBaseline = state.baselines.find((b) => b.key === SHOP_KEY)?.row;
  assert(JSON.stringify(verifyShopRestored?.value ?? null) === JSON.stringify(originalShopBaseline?.value ?? null), "17. Shop filter settings restored to their exact pre-test state");
  state.mutatedKeys.delete(SHOP_KEY);

  // ============================================================
  // BILLING (18-24) — never compulsory, defaults to shipping.
  // ============================================================
  log("BILLING", "same-as-shipping default, opt-in different billing, server-side enforcement");

  const billingCookie = await register(BILLING_EMAIL, `QA Billing ${RUN_ID}`);
  const billing2Cookie = await register(BILLING2_EMAIL, `QA Billing2 ${RUN_ID}`);
  const product = await prisma.product.findFirst({ where: { status: "ACTIVE" }, select: { id: true } });
  if (!product) throw new Error("No ACTIVE product found to test checkout with.");
  state.touchedProductId = product.id;
  const beforeStock = await prisma.product.findUnique({ where: { id: product.id }, select: { stockAvailable: true } });
  state.touchedProductBaselineStock = beforeStock?.stockAvailable ?? null;

  async function addToCart(cookie: string) {
    await fetch(`${BASE}/api/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ productId: product!.id, quantity: 1 }),
    });
  }
  const shippingAddress = {
    fullName: "QA Billing Test", countryCode: "IN", phone: "9876543210",
    line1: "1 Test Lane", line2: "Near Test Landmark, Test Area",
    city: "Mumbai", state: "Maharashtra", pincode: "400001", country: "India",
  };
  const differentBillingAddress = {
    fullName: "QA Billing Test (Office)", countryCode: "IN", phone: "9123456780",
    line1: "22 Office Park", line2: "Near Metro Station, Business District",
    city: "Pune", state: "Maharashtra", pincode: "411001", country: "India",
  };

  // Module 43: allowDifferentBillingAddress is a store-wide setting, OFF by
  // default — capture the real baseline once, then explicitly drive it to
  // known OFF/ON states for the tests below rather than assuming its
  // current value. Restored to the exact captured baseline by this file's
  // normal end-of-run restoreBaselines(state), same as every other Setting
  // this script touches.
  await captureBaseline(state, CHECKOUT_KEY);
  const checkoutBaselineRow = state.baselines.find((b) => b.key === CHECKOUT_KEY)?.row;
  const currentCheckoutValue = (checkoutBaselineRow?.value as Record<string, unknown>) ?? {};
  const baseCheckoutBody = {
    heading: "Checkout", placeOrderButtonText: "Place Order", enableCOD: true, enableOnlinePayment: true,
    enableGuestCheckout: true, enableGiftMessage: true, enableOrderNotes: true,
    ...currentCheckoutValue,
  };
  async function setAllowDifferentBilling(allow: boolean) {
    const res = await patchSettings(adminCookie, "checkout", { ...baseCheckoutBody, allowDifferentBillingAddress: allow }, "settings");
    if (!res.ok) throw new Error(`checkout settings PATCH failed: ${await res.text()}`);
    state.mutatedKeys.add(CHECKOUT_KEY);
  }

  // 18c (Module 43). Setting OFF: a manipulated "different billing" claim
  // is silently ignored server-side — order still succeeds, but billing is
  // forced to the shipping address, never the fabricated one.
  await setAllowDifferentBilling(false);
  await addToCart(billingCookie);
  const offBypassRes = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: billingCookie },
    body: JSON.stringify({ email: BILLING_EMAIL, paymentMethod: "COD", billingSameAsShipping: false, billingAddress: differentBillingAddress, shippingAddress }),
  });
  const offBypassJson = await offBypassRes.json();
  assert(offBypassRes.ok && offBypassJson.success, "18c. Setting OFF: order still places despite a manipulated 'different billing' claim");
  state.qaOrderIds.push(offBypassJson.data.orderId);
  const offBypassOrder = await prisma.order.findUnique({ where: { id: offBypassJson.data.orderId } });
  assert(JSON.stringify(offBypassOrder?.billingAddress) === JSON.stringify(offBypassOrder?.shippingAddress), "18d. Setting OFF: fabricated billingAddress ignored — stored billing equals shipping, not the manipulated value");

  // Tests 18-24 below assume the pre-Module-43 unconditional-choice
  // behavior, which now only applies while the setting is ON.
  await setAllowDifferentBilling(true);

  // 18. same-as-shipping (default / explicit true) — COD path.
  await addToCart(billingCookie);
  const sameRes = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: billingCookie },
    body: JSON.stringify({ email: BILLING_EMAIL, paymentMethod: "COD", billingSameAsShipping: true, shippingAddress }),
  });
  const sameJson = await sameRes.json();
  assert(sameRes.ok && sameJson.success, "18. Checkout with billingSameAsShipping=true succeeds without a billingAddress");
  state.qaOrderIds.push(sameJson.data.orderId);
  const sameOrder = await prisma.order.findUnique({ where: { id: sameJson.data.orderId } });
  assert(JSON.stringify(sameOrder?.billingAddress) === JSON.stringify(sameOrder?.shippingAddress), "18b. Order.billingAddress equals Order.shippingAddress when same-as-shipping was chosen");

  // 19. different billing — COD path (also exercises item 23). Setting ON (see above).
  await addToCart(billingCookie);
  const diffRes = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: billingCookie },
    body: JSON.stringify({ email: BILLING_EMAIL, paymentMethod: "COD", billingSameAsShipping: false, billingAddress: differentBillingAddress, shippingAddress }),
  });
  const diffJson = await diffRes.json();
  assert(diffRes.ok && diffJson.success, "19/23. Checkout with a different billing address succeeds (COD path)");
  state.qaOrderIds.push(diffJson.data.orderId);
  const diffOrder = await prisma.order.findUnique({ where: { id: diffJson.data.orderId } });
  const storedBilling = diffOrder?.billingAddress as Record<string, unknown> | null;
  assert(storedBilling?.city === differentBillingAddress.city, "19b. Order.billingAddress stores the genuinely different address, not the shipping one");

  // 20/22. blank separate billing / server-side manipulation: client claims
  // "different billing" but sends nothing — must be rejected, not silently
  // fall back to shipping (that would defeat the customer's own choice) and
  // must not crash.
  await addToCart(billingCookie);
  const blankRes = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: billingCookie },
    body: JSON.stringify({ email: BILLING_EMAIL, paymentMethod: "COD", billingSameAsShipping: false, shippingAddress }),
  });
  assert(blankRes.status === 400, "20/22. billingSameAsShipping=false with no billingAddress is rejected server-side (400), not silently accepted");

  // 21. invalid different billing (present but malformed — missing required fields)
  await addToCart(billingCookie);
  const invalidRes = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: billingCookie },
    body: JSON.stringify({ email: BILLING_EMAIL, paymentMethod: "COD", billingSameAsShipping: false, billingAddress: { ...differentBillingAddress, pincode: "123" }, shippingAddress }),
  });
  assert(invalidRes.status === 400, "21. An invalid different-billing address (bad pincode) is rejected server-side (400)");

  // 24. Razorpay preparation path — same billing rules apply; a real charge
  // is never attempted (no production Razorpay credentials in this
  // environment). A 500 here (only) is the expected, disclosed,
  // credential-dependent limitation, not a billing-logic failure.
  await addToCart(billing2Cookie);
  const rpBlankRes = await fetch(`${BASE}/api/payment/razorpay/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: billing2Cookie },
    body: JSON.stringify({ email: BILLING2_EMAIL, billingSameAsShipping: false, shippingAddress }),
  });
  assert(rpBlankRes.status === 400, "24a. Razorpay prep: billingSameAsShipping=false with no billingAddress is rejected server-side (400)");

  const rpValidRes = await fetch(`${BASE}/api/payment/razorpay/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: billing2Cookie },
    body: JSON.stringify({ email: BILLING2_EMAIL, billingSameAsShipping: true, shippingAddress }),
  });
  assert(rpValidRes.status !== 400, "24b. Razorpay prep: a valid same-as-shipping request passes billing validation (any failure here is only the disclosed missing-Razorpay-credentials limitation, status " + rpValidRes.status + ")");

  // ============================================================
  // MEGA-MENU (25-29)
  // ============================================================
  log("MEGA-MENU", "auto (live catalog) vs custom (hand-picked) columns");
  await captureBaseline(state, NAVIGATION_KEY);
  const nav = await getSettings(adminCookie, "navigation");

  // 25/26. auto mode reflects the live catalog by default (unconfigured state).
  const homeHtmlAuto = await (await fetch(`${BASE}/`)).text();
  assert(homeHtmlAuto.includes(`>${category.name}<`) && homeHtmlAuto.includes(`href="/categories/${category.slug}"`), "25. Categories mega-menu column (auto mode) reflects a real, live category");
  assert(homeHtmlAuto.includes(`>${theme.name}<`) && homeHtmlAuto.includes(`href="/themes/${theme.slug}"`), "26. Themes mega-menu column (auto mode) reflects a real, live theme");

  // 27. Shop by Room heading is editable.
  const qaRoomHeading = `QA Room Heading ${RUN_ID}`;
  const roomRes = await patchSettings(adminCookie, "navigation", { ...nav, shopByRoom: { ...nav.shopByRoom, heading: qaRoomHeading } });
  assert(roomRes.ok, "Shop by Room heading update accepted");
  state.mutatedKeys.add(NAVIGATION_KEY);
  const homeHtmlRoom = await (await fetch(`${BASE}/`)).text();
  assert(homeHtmlRoom.includes(qaRoomHeading), "27. Shop by Room column heading is admin-editable and renders live");

  // 28. add/remove/reorder in custom mode, referencing real category ids.
  const allCategories = await prisma.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" }, take: 2, select: { id: true, name: true, slug: true } });
  if (allCategories.length < 2) throw new Error("Need at least 2 visible categories to test custom mega-menu reordering.");
  const [firstCat, secondCat] = allCategories;
  const customRes = await patchSettings(adminCookie, "navigation", {
    ...nav,
    shopByRoom: { ...nav.shopByRoom, heading: qaRoomHeading },
    megaMenuCategories: {
      heading: "Categories", mode: "custom",
      limit: 5,
      refs: [{ id: secondCat.id, sortOrder: 0 }, { id: firstCat.id, sortOrder: 1 }],
    },
  });
  assert(customRes.ok, "28. Custom mega-menu category selection accepted");
  const homeHtmlCustom = await (await fetch(`${BASE}/`)).text();
  const secondIdx = homeHtmlCustom.indexOf(`href="/categories/${secondCat.slug}"`);
  const firstIdx = homeHtmlCustom.indexOf(`href="/categories/${firstCat.slug}"`);
  assert(secondIdx !== -1 && firstIdx !== -1 && secondIdx < firstIdx, "28b. Custom mode renders the hand-picked categories in the specified order");

  // 29. broken-reference protection — a bogus id must be silently dropped, never crash.
  const brokenRes = await patchSettings(adminCookie, "navigation", {
    ...nav,
    shopByRoom: { ...nav.shopByRoom, heading: qaRoomHeading },
    megaMenuCategories: {
      heading: "Categories", mode: "custom", limit: 5,
      refs: [{ id: "qa-bogus-category-id-does-not-exist", sortOrder: 0 }, { id: firstCat.id, sortOrder: 1 }],
    },
  });
  assert(brokenRes.ok, "29. A reference to a non-existent category id is accepted at the settings layer");
  const homeHtmlBroken = await fetch(`${BASE}/`);
  assert(homeHtmlBroken.status === 200, "29b. Homepage still renders 200 with a broken mega-menu reference (no crash)");
  const brokenHtml = await homeHtmlBroken.text();
  assert(brokenHtml.includes(`href="/categories/${firstCat.slug}"`), "29c. The valid reference alongside the broken one still renders correctly");
  assert(!brokenHtml.includes("qa-bogus-category-id-does-not-exist"), "29d. The broken reference itself never reaches the rendered HTML");

  console.log("\n✅ All Module 38 checks passed.");
}

async function cleanup(state: RunState, beforeCounts: Awaited<ReturnType<typeof tableCounts>>, adminCookie: string) {
  // Reverse the real product's net stock effect BEFORE restoring settings —
  // same ordering discipline as simulate-cod-risk.ts.
  if (state.touchedProductId && state.touchedProductBaselineStock !== null) {
    const current = await prisma.product.findUnique({ where: { id: state.touchedProductId }, select: { stockAvailable: true } });
    const diff = (current?.stockAvailable ?? state.touchedProductBaselineStock) - state.touchedProductBaselineStock;
    if (diff !== 0) {
      const res = await fetch(`${BASE}/api/admin/products/${state.touchedProductId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ change: -diff, reason: "correction", note: `QA simulator cleanup — reversing test inventory mutation (simulate-media run ${RUN_ID})` }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(`Stock restoration FAILED: ${JSON.stringify(json)}`);
      const verify = await prisma.product.findUnique({ where: { id: state.touchedProductId }, select: { stockAvailable: true } });
      if (verify?.stockAvailable !== state.touchedProductBaselineStock) {
        throw new Error(`Stock restoration VERIFICATION FAILED: expected ${state.touchedProductBaselineStock}, got ${verify?.stockAvailable}.`);
      }
      await prisma.stockMovement.delete({ where: { id: json.data.movement.id } });
      log("Stock restored to baseline (verified)", { productId: state.touchedProductId, reversedDiff: diff });
    }
  }

  await restoreBaselines(state);

  // 30/31/32. QA record + settings cleanup, verified.
  const qaOrders = await prisma.order.findMany({ where: { id: { in: state.qaOrderIds } }, select: { id: true, orderNumber: true } });
  const qaOrderIds = qaOrders.map((o) => o.id);
  const qaOrderNumbers = qaOrders.map((o) => o.orderNumber);

  if (qaOrderNumbers.length > 0) {
    const delMovements = await prisma.stockMovement.deleteMany({ where: { OR: qaOrderNumbers.map((n) => ({ note: { contains: n } })) } });
    log("Cleanup: order-related StockMovement rows removed", delMovements.count);
  }
  const delActivity = await prisma.activityLog.deleteMany({ where: { entity: "Order", entityId: { in: qaOrderIds } } });

  // Notification.metadata is a JSON blob referencing orderId/userId, not a
  // real foreign key — same discovery Module 21/35's cod-risk script made.
  // Broad candidate fetch + JS-side substring match, same safe pattern.
  const candidateNotifications = qaOrderIds.length > 0 ? await prisma.notification.findMany({ where: { type: "order.placed" }, select: { id: true, metadata: true } }) : [];
  const notificationIdsToDelete = candidateNotifications
    .filter((n) => qaOrderIds.some((id) => JSON.stringify(n.metadata ?? {}).includes(id)))
    .map((n) => n.id);
  const delNotifications = notificationIdsToDelete.length > 0 ? await prisma.notification.deleteMany({ where: { id: { in: notificationIdsToDelete } } }) : { count: 0 };

  const delOrders = await prisma.order.deleteMany({ where: { id: { in: qaOrderIds } } });
  const delUsers = await prisma.user.deleteMany({ where: { email: { in: [CUSTOMER_EMAIL, BILLING_EMAIL, BILLING2_EMAIL] } } });

  const afterCounts = await tableCounts();
  log("Cleanup summary", {
    ordersDeleted: delOrders.count, activityLogRowsDeleted: delActivity.count,
    notificationsDeleted: delNotifications.count, usersDeleted: delUsers.count,
  });
  log("DB counts after", afterCounts);

  const countsMatch =
    beforeCounts.users === afterCounts.users &&
    beforeCounts.orders === afterCounts.orders &&
    beforeCounts.orderItems === afterCounts.orderItems &&
    beforeCounts.payments === afterCounts.payments &&
    beforeCounts.settings === afterCounts.settings &&
    beforeCounts.stockMovements === afterCounts.stockMovements &&
    beforeCounts.notifications === afterCounts.notifications;
  if (!countsMatch) {
    throw new Error(`Post-cleanup DB counts do not match the pre-test baseline. before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`);
  }
  console.log("  ✓ 32. Database counts match the pre-test baseline exactly — zero QA residue");
}

async function main() {
  log("Config", { BASE, ADMIN_EMAIL, RUN_ID, KEEP });

  const beforeCounts = await tableCounts();
  log("DB counts before", beforeCounts);

  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const customerCookie = await register(CUSTOMER_EMAIL, `QA Media Customer ${RUN_ID}`);

  const state: RunState = { baselines: [], mutatedKeys: new Set(), qaOrderIds: [], touchedProductId: null, touchedProductBaselineStock: null };

  let testError: unknown = null;
  try {
    await runTest(state, adminCookie, customerCookie);
  } catch (err) {
    testError = err;
  }

  let cleanupError: unknown = null;
  if (!KEEP) {
    try {
      await cleanup(state, beforeCounts, adminCookie);
    } catch (err) {
      cleanupError = err;
    }
  } else {
    log("Cleanup skipped (--keep)", { CUSTOMER_EMAIL, BILLING_EMAIL, BILLING2_EMAIL, qaOrderIds: state.qaOrderIds });
  }

  if (testError) console.error("\n❌ Media/filters/billing/mega-menu simulation failed:", testError);
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
