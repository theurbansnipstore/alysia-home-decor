/**
 * Module 36 regression + security harness for the CMS Pages feature and
 * Website Settings additions (Announcement Bar) — exercises the REAL
 * running app against the local dev/production server and database, same
 * pattern as every other simulate-*.ts script in this project (self-
 * cleaning @example.test data, admin login via the real /api/auth/login
 * route).
 *
 * Covers:
 *   - Full role matrix on /api/admin/pages (unauthenticated, CUSTOMER,
 *     SUPPORT_STAFF, authorized CONTENT_AREA_ROLES)
 *   - Draft pages are never publicly reachable; publish/unpublish flips
 *     public 200/404 correctly
 *   - Public content, SEO title/description, and canonical tag are correct
 *   - Sitemap includes published pages and excludes drafts
 *   - Slug collision and reserved-path rejection
 *   - Update and delete
 *   - Website settings (Announcement Bar) update, live render, and exact
 *     restoration afterward — captures whatever value existed (including
 *     "no row at all", the pre-Module-36 state) before mutating, and
 *     restores that exact state, never a guessed default (same discipline
 *     as Module 35's stock-baseline capture/restore)
 *   - XSS payload in page content is neutralized (no raw <script> reaches
 *     the response — plain-text rendering, no dangerouslySetInnerHTML)
 *   - Existing product/category/theme URLs are unaffected by the new
 *     root-level /[slug] route
 *   - Full QA data cleanup with a before/after DB count comparison
 *
 * Cleanup structure (Module 35 discipline, applied here too): the test
 * body and the cleanup/restore step run in SEPARATE try/catch blocks, so a
 * failed assertion partway through still lets cleanup attempt to run and
 * still lets a cleanup failure be reported on its own — one is never
 * allowed to silently mask the other, and a run is never reported as clean
 * if cleanup itself failed.
 *
 * Requires: `npm run dev` (or a production build via `npm run start`)
 * running locally, and a SUPER_ADMIN account (defaults to the seeded
 * admin@kutir.in / Admin@12345, same as every other simulate-*.ts script —
 * override with ADMIN_EMAIL/ADMIN_PASSWORD).
 *
 * Usage:
 *   npm run simulate:cms
 *   npm run simulate:cms -- --keep   (skip cleanup, for manual inspection)
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

const CUSTOMER_EMAIL = `qa-cms-customer-${RUN_ID}@example.test`;
const SUPPORT_EMAIL = `qa-cms-support-${RUN_ID}@example.test`;
const STAFF_PASSWORD = "QaStaff12345!";
const ANNOUNCEMENT_KEY = "store_announcement";

async function tableCounts() {
  const [users, pages, settings, activityLogs] = await Promise.all([
    prisma.user.count(),
    prisma.page.count(),
    prisma.setting.count(),
    prisma.activityLog.count(),
  ]);
  return { users, pages, settings, activityLogs };
}

/** Populated as resources are created so cleanup can find them even if a later assertion throws partway through. */
interface RunState {
  pageIdsCreated: string[];
  supportStaffId: string | null;
  originalAnnouncementRow: { value: Prisma.JsonValue } | null | undefined;
  announcementMutated: boolean;
}

async function runTest(state: RunState) {
  const superAdminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

  // Capture the announcement baseline FIRST, before any test touches it —
  // `undefined` means "not yet captured" (cleanup must not restore based on
  // an undefined baseline); `null` means captured-and-confirmed-absent.
  state.originalAnnouncementRow = await prisma.setting.findUnique({ where: { key: ANNOUNCEMENT_KEY } });
  log("Announcement baseline captured", state.originalAnnouncementRow ? { existed: true, value: state.originalAnnouncementRow.value } : { existed: false });

  // --- QA accounts through the real APIs ---
  log("Setup", "creating QA support-staff account via /api/admin/users, QA customer via /api/auth/register");
  const createStaffRes = await fetch(`${BASE}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
    body: JSON.stringify({ name: `QA Support ${RUN_ID}`, email: SUPPORT_EMAIL, password: STAFF_PASSWORD, role: "SUPPORT_STAFF" }),
  });
  const createStaffJson = await createStaffRes.json();
  if (!createStaffRes.ok || !createStaffJson.success) throw new Error(`QA staff creation failed: ${JSON.stringify(createStaffJson)}`);
  state.supportStaffId = createStaffJson.data.id as string;

  const customerCookie = await register(CUSTOMER_EMAIL, `QA Customer ${RUN_ID}`);
  const supportCookie = await login(SUPPORT_EMAIL, STAFF_PASSWORD);

  const createPage = (cookie: string | null, body: Record<string, unknown>) =>
    fetch(`${BASE}/api/admin/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
  const updatePage = (cookie: string | null, id: string, body: Record<string, unknown>) =>
    fetch(`${BASE}/api/admin/pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
  const deletePage = (cookie: string | null, id: string) =>
    fetch(`${BASE}/api/admin/pages/${id}`, { method: "DELETE", headers: { ...(cookie ? { Cookie: cookie } : {}) } });

  const basePayload = () => ({
    title: `QA CMS Page ${RUN_ID}`,
    slug: `qa-cms-page-${RUN_ID}`,
    content: `This is temporary QA content for Module 36's CMS regression script (run ${RUN_ID}).\n\nIt has a second paragraph to verify paragraph breaks render.`,
    excerpt: `QA excerpt ${RUN_ID}`,
  });

  // ============================================================
  // Part 1 — role matrix on create
  // ============================================================
  log("Part 1", "role matrix on POST /api/admin/pages");
  assert((await createPage(null, basePayload())).status === 401, "1. Unauthenticated page creation is rejected");
  assert((await createPage(customerCookie, basePayload())).status === 403, "2. CUSTOMER page creation is rejected");
  assert((await createPage(supportCookie, basePayload())).status === 403, "3. Unauthorized staff (SUPPORT_STAFF) page creation is rejected");

  const createRes = await createPage(superAdminCookie, basePayload());
  const createJson = await createRes.json();
  assert(createRes.status === 201 && createJson.success, "4. Authorized admin can create a draft page");
  const pageId = createJson.data.id as string;
  const slug = createJson.data.slug as string;
  state.pageIdsCreated.push(pageId);
  log("QA page created", { pageId, slug });

  // ============================================================
  // Part 2 — draft is not public
  // ============================================================
  log("Part 2", "draft page is not public");
  const draftPublicRes = await fetch(`${BASE}/${slug}`);
  assert(draftPublicRes.status === 404, "5. Draft page returns 404 to an anonymous visitor");

  // ============================================================
  // Part 3 — publish, public render, SEO, canonical
  // ============================================================
  log("Part 3", "publish + public rendering + SEO + canonical");
  const publishRes = await updatePage(superAdminCookie, pageId, { status: "PUBLISHED" });
  const publishJson = await publishRes.json();
  assert(publishRes.ok && publishJson.success && publishJson.data.status === "PUBLISHED", "6. Admin can publish the page");

  const publicRes = await fetch(`${BASE}/${slug}`);
  assert(publicRes.status === 200, "7. Published page returns 200");
  const publicHtml = await publicRes.text();
  assert(publicHtml.includes(basePayload().title), "8. Public content includes the page title");
  assert(publicHtml.includes(`This is temporary QA content for Module 36`), "8b. Public content includes the page body");
  assert(publicHtml.includes(`<title>${basePayload().title} |`), "9. SEO title defaults to the generated \"Title | Brand\" form when no custom seoTitle is set");
  assert(publicHtml.includes(basePayload().excerpt), "10. SEO description falls back to the excerpt (generated, no custom seoDesc set)");
  assert(publicHtml.includes(`rel="canonical" href="`) && publicHtml.includes(`/${slug}"`), "11. Canonical tag points at the page's own URL");

  // Custom SEO override
  const customSeoRes = await updatePage(superAdminCookie, pageId, { seoTitle: `Custom SEO Title ${RUN_ID}`, seoDesc: `Custom SEO description ${RUN_ID}` });
  assert(customSeoRes.ok, "Custom SEO fields save");
  const customSeoHtml = await (await fetch(`${BASE}/${slug}`)).text();
  assert(customSeoHtml.includes(`<title>Custom SEO Title ${RUN_ID}`), "9b. Custom seoTitle overrides the generated title");
  assert(customSeoHtml.includes(`Custom SEO description ${RUN_ID}`), "10b. Custom seoDesc overrides the generated description");

  // ============================================================
  // Part 4 — sitemap
  // ============================================================
  log("Part 4", "sitemap inclusion/exclusion");
  const draftPayload = { ...basePayload(), title: `QA CMS Draft ${RUN_ID}`, slug: `qa-cms-draft-${RUN_ID}` };
  const draftRes = await createPage(superAdminCookie, draftPayload);
  const draftJson = await draftRes.json();
  assert(draftRes.status === 201, "Second QA page (kept as draft) created for the sitemap-exclusion check");
  const draftPageId = draftJson.data.id as string;
  state.pageIdsCreated.push(draftPageId);

  const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  assert(sitemapXml.includes(`/${slug}<`), "12. Sitemap includes the published page");
  assert(!sitemapXml.includes(`/${draftPayload.slug}<`), "13. Sitemap excludes the draft page");

  // ============================================================
  // Part 5 — unpublish removes public access
  // ============================================================
  log("Part 5", "unpublish");
  const unpublishRes = await updatePage(superAdminCookie, pageId, { status: "DRAFT" });
  assert(unpublishRes.ok, "Admin can unpublish the page");
  const afterUnpublishRes = await fetch(`${BASE}/${slug}`);
  assert(afterUnpublishRes.status === 404, "14. Unpublishing removes public access (404 again)");
  await updatePage(superAdminCookie, pageId, { status: "PUBLISHED" });

  // ============================================================
  // Part 6 — slug collision + reserved path
  // ============================================================
  log("Part 6", "slug collision + reserved path rejection");
  const collisionRes = await createPage(superAdminCookie, { ...basePayload(), title: "Duplicate slug attempt" });
  assert(collisionRes.status === 409, "15. Creating a page with an already-used slug is rejected");

  const reservedRes = await createPage(superAdminCookie, { ...basePayload(), slug: "checkout", title: "Reserved slug attempt" });
  assert(reservedRes.status === 409, "16. Creating a page at a reserved path (\"checkout\") is rejected");
  const reservedAdminRes = await createPage(superAdminCookie, { ...basePayload(), slug: "admin", title: "Reserved admin slug attempt" });
  assert(reservedAdminRes.status === 409, "16b. Creating a page at the reserved \"admin\" path is rejected");

  // ============================================================
  // Part 7 — update
  // ============================================================
  log("Part 7", "update");
  const newTitle = `QA CMS Page ${RUN_ID} (updated)`;
  const updateRes = await updatePage(superAdminCookie, pageId, { title: newTitle });
  const updateJson = await updateRes.json();
  assert(updateRes.ok && updateJson.data.title === newTitle, "17. Update page works and persists");
  const afterUpdateHtml = await (await fetch(`${BASE}/${slug}`)).text();
  assert(afterUpdateHtml.includes(newTitle), "17b. Updated title is reflected on the public page");

  assert((await updatePage(customerCookie, pageId, { title: "hacked" })).status === 403, "Update is rejected for CUSTOMER");
  assert((await updatePage(null, pageId, { title: "hacked" })).status === 401, "Update is rejected unauthenticated");

  // ============================================================
  // Part 8 — delete
  // ============================================================
  log("Part 8", "delete");
  assert((await deletePage(customerCookie, draftPageId)).status === 403, "Delete is rejected for CUSTOMER");
  assert((await deletePage(null, draftPageId)).status === 401, "Delete is rejected unauthenticated");
  const delRes = await deletePage(superAdminCookie, draftPageId);
  assert(delRes.ok, "18. Authorized delete succeeds");
  // Deliberately NOT removed from state.pageIdsCreated — that list also
  // drives the ActivityLog cleanup below, and this page's own
  // page.created/page.deleted rows still need to be swept even though the
  // Page row itself is already gone (a deleteMany against an already-
  // absent id is a harmless no-op, never an error).
  const stillThereRes = await fetch(`${BASE}/api/admin/pages/${draftPageId}`, { headers: { Cookie: superAdminCookie } });
  assert(stillThereRes.status === 404, "18b. Deleted page is gone from the admin API too");

  // ============================================================
  // Part 9 — XSS payload safety
  // ============================================================
  log("Part 9", "malicious HTML/XSS payload safety");
  const xssPayload = `Safe text before.\n<script>alert('xss-${RUN_ID}')</script>\n<img src=x onerror="alert('xss2-${RUN_ID}')">`;
  const xssPageRes = await createPage(superAdminCookie, {
    title: `QA CMS XSS Test ${RUN_ID}`,
    slug: `qa-cms-xss-${RUN_ID}`,
    content: xssPayload,
    status: "PUBLISHED",
  });
  const xssPageJson = await xssPageRes.json();
  assert(xssPageRes.status === 201, "XSS-payload QA page created");
  const xssPageId = xssPageJson.data.id as string;
  state.pageIdsCreated.push(xssPageId);

  const xssHtml = await (await fetch(`${BASE}/${xssPageJson.data.slug}`)).text();
  assert(!xssHtml.includes(`<script>alert('xss-${RUN_ID}')</script>`), "21. Raw <script> tag from page content never reaches the response unescaped");
  assert(!xssHtml.includes(`onerror="alert('xss2-${RUN_ID}')"`), "21b. Raw onerror handler from page content never reaches the response unescaped");
  assert(xssHtml.includes("Safe text before."), "21c. The safe portion of the content still renders");

  // ============================================================
  // Part 10 — existing routes unaffected
  // ============================================================
  log("Part 10", "existing product/category/theme URLs unaffected by the new /[slug] route");
  const [existingProduct, existingCategory, existingTheme] = await Promise.all([
    prisma.product.findFirst({ where: { status: "ACTIVE" }, select: { slug: true } }),
    prisma.category.findFirst({ where: { isVisible: true }, select: { slug: true } }),
    prisma.theme.findFirst({ where: { isEnabled: true }, select: { slug: true } }),
  ]);
  if (existingProduct) assert((await fetch(`${BASE}/product/${existingProduct.slug}`)).status === 200, "22. Existing /product/[slug] route still returns 200");
  if (existingCategory) assert((await fetch(`${BASE}/categories/${existingCategory.slug}`)).status === 200, "22b. Existing /categories/[slug] route still returns 200");
  if (existingTheme) assert((await fetch(`${BASE}/themes/${existingTheme.slug}`)).status === 200, "22c. Existing /themes/[slug] route still returns 200");
  assert((await fetch(`${BASE}/about`)).status === 200, "22d. /about (a reserved top-level route) still resolves to its real page, not the CMS catch-all");

  // ============================================================
  // Part 11 — Website Settings (Announcement Bar): update + live render
  // (restoration to the captured baseline happens in cleanup, not here, so
  // it still runs even if an earlier or later assertion throws)
  // ============================================================
  log("Part 11", "announcement-bar settings update + live render");
  assert(
    (
      await fetch(`${BASE}/api/admin/content/announcement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, text: "x", link: "" }),
      })
    ).status === 401,
    "Announcement update is rejected unauthenticated"
  );
  assert(
    (
      await fetch(`${BASE}/api/admin/content/announcement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: customerCookie },
        body: JSON.stringify({ enabled: true, text: "x", link: "" }),
      })
    ).status === 403,
    "Announcement update is rejected for CUSTOMER"
  );

  const qaAnnouncementText = `QA announcement text ${RUN_ID}`;
  const setAnnouncementRes = await fetch(`${BASE}/api/admin/content/announcement`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
    body: JSON.stringify({ enabled: true, text: qaAnnouncementText, link: "" }),
  });
  state.announcementMutated = true;
  assert(setAnnouncementRes.ok, "19. Authorized website-settings (announcement) update works");

  const homeHtmlWithAnnouncement = await (await fetch(`${BASE}/`)).text();
  assert(homeHtmlWithAnnouncement.includes(qaAnnouncementText), "20. Homepage renders the updated announcement text");

  const disableRes = await fetch(`${BASE}/api/admin/content/announcement`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
    body: JSON.stringify({ enabled: false, text: qaAnnouncementText, link: "" }),
  });
  assert(disableRes.ok, "Announcement can be disabled");
  const homeHtmlDisabled = await (await fetch(`${BASE}/`)).text();
  assert(!homeHtmlDisabled.includes(qaAnnouncementText), "20b. Disabling the announcement removes it from the homepage");

  console.log("\n✅ All Module 36 CMS regression + security checks passed.");
}

/** Runs unconditionally after runTest, whether it succeeded or threw partway through. */
async function cleanup(state: RunState, beforeCounts: Awaited<ReturnType<typeof tableCounts>>) {
  // Restore the announcement setting FIRST, before deleting anything else —
  // mirrors Module 35's "reverse the real mutation before touching QA audit
  // rows" ordering. Only attempted if Part 11 actually got far enough to
  // mutate it AND the baseline was actually captured.
  if (state.announcementMutated && state.originalAnnouncementRow !== undefined) {
    if (state.originalAnnouncementRow === null) {
      await prisma.setting.delete({ where: { key: ANNOUNCEMENT_KEY } }).catch(() => undefined);
      const verify = await prisma.setting.findUnique({ where: { key: ANNOUNCEMENT_KEY } });
      if (verify !== null) throw new Error("Announcement-bar restoration FAILED: expected no row (pre-test state), row still exists. Manual review required.");
    } else {
      await prisma.setting.update({ where: { key: ANNOUNCEMENT_KEY }, data: { value: state.originalAnnouncementRow.value as object } });
      const verify = await prisma.setting.findUnique({ where: { key: ANNOUNCEMENT_KEY } });
      if (JSON.stringify(verify?.value) !== JSON.stringify(state.originalAnnouncementRow.value)) {
        throw new Error("Announcement-bar restoration VERIFICATION FAILED: restored value does not match the captured baseline. Manual review required.");
      }
    }
    log("Announcement-bar setting restored to its exact pre-test state", { hadExistingRow: state.originalAnnouncementRow !== null });
  } else {
    log("Announcement-bar restoration skipped", "setting was never mutated this run");
  }

  const delPages = await prisma.page.deleteMany({ where: { id: { in: state.pageIdsCreated } } });
  const delActivity = await prisma.activityLog.deleteMany({ where: { entity: "Page", entityId: { in: state.pageIdsCreated } } });
  const delStaff = state.supportStaffId ? await prisma.user.deleteMany({ where: { id: state.supportStaffId } }) : { count: 0 };
  const delCustomer = await prisma.user.deleteMany({ where: { email: CUSTOMER_EMAIL } });

  const afterCounts = await tableCounts();
  log("Cleanup", {
    pagesDeleted: delPages.count,
    activityLogRowsDeleted: delActivity.count,
    staffAccountsDeleted: delStaff.count,
    customerAccountsDeleted: delCustomer.count,
  });
  log("DB counts after", afterCounts);

  const countsMatch = beforeCounts.users === afterCounts.users && beforeCounts.pages === afterCounts.pages && beforeCounts.settings === afterCounts.settings;
  if (!countsMatch) {
    throw new Error(`Post-cleanup DB counts do not match the pre-test baseline. before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`);
  }
  console.log("  ✓ 23. Database counts (users/pages/settings) match the pre-test baseline exactly — zero QA residue");
}

async function main() {
  log("Config", { BASE, ADMIN_EMAIL, RUN_ID, KEEP });

  const beforeCounts = await tableCounts();
  log("DB counts before", beforeCounts);

  const state: RunState = { pageIdsCreated: [], supportStaffId: null, originalAnnouncementRow: undefined, announcementMutated: false };

  let testError: unknown = null;
  try {
    await runTest(state);
  } catch (err) {
    testError = err;
  }

  let cleanupError: unknown = null;
  if (!KEEP) {
    try {
      await cleanup(state, beforeCounts);
    } catch (err) {
      cleanupError = err;
    }
  } else {
    log("Cleanup skipped (--keep)", { pageIdsCreated: state.pageIdsCreated, supportStaffId: state.supportStaffId, CUSTOMER_EMAIL });
  }

  if (testError) console.error("\n❌ CMS simulation failed:", testError);
  if (cleanupError) console.error("\n❌ CLEANUP FAILED — state may be inconsistent, manual review required:", cleanupError);
  if (testError || cleanupError) process.exitCode = 1;
}

main().finally(async () => {
  await prisma.$disconnect();
});
