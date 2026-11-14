/**
 * SEO regression harness for Module 33 (Production-Ready SEO & Search
 * Visibility Architecture) — exercises the REAL running app against the
 * local dev server and database, same pattern as simulate-shipment.ts /
 * simulate-cod-risk.ts. Read-only checks against real data plus one
 * throwaway QA product (created and deleted here, like every other
 * simulate-*.ts script's @example.test data) used specifically to prove
 * the Module 32 slug-redirect system still 308s after this module's
 * changes — no existing product's slug is ever touched.
 *
 * Requires: `npm run dev` running locally, and a SUPER_ADMIN/ADMIN account
 * to create/clean up the QA product (defaults to the seeded
 * admin@kutir.in / Admin@12345 — override with ADMIN_EMAIL/ADMIN_PASSWORD
 * env vars).
 *
 * Usage:
 *   npm run simulate:seo
 *   npm run simulate:seo -- --keep   (skip cleanup, for manual inspection)
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

async function adminLogin(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`admin login failed: ${res.status} ${await res.text()}`);
  return extractCookie(res);
}

/** All <script type="application/ld+json"> blocks on a page, parsed. Throws if any block isn't valid JSON (the XSS-escaping in JsonLd.tsx must still leave valid JSON). */
function extractJsonLd(html: string): any[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks.map((b) => JSON.parse(b[1]));
}

function extractMetaContent(html: string, nameOrProperty: string): string | null {
  const re = new RegExp(`<meta[^>]*(?:name|property)="${nameOrProperty}"[^>]*content="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1] : null;
}

function extractCanonical(html: string): string | null {
  const m = html.match(/<link rel="canonical" href="([^"]*)"/i);
  return m ? m[1] : null;
}

function hasRobotsNoindex(html: string): boolean {
  const content = extractMetaContent(html, "robots");
  return !!content && content.includes("noindex");
}

async function main() {
  log("Config", { BASE, ADMIN_EMAIL, RUN_ID, KEEP });

  // --- robots.txt ---
  const robotsRes = await fetch(`${BASE}/robots.txt`);
  const robotsText = await robotsRes.text();
  assert(robotsRes.status === 200, "GET /robots.txt returns 200");
  assert(robotsText.includes("Disallow: /admin"), "robots.txt disallows /admin");
  assert(robotsText.includes("Disallow: /checkout"), "robots.txt disallows /checkout");
  assert(/Sitemap: .*\/sitemap\.xml/.test(robotsText), "robots.txt references sitemap.xml");

  // --- sitemap.xml ---
  const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
  const sitemapText = await sitemapRes.text();
  assert(sitemapRes.status === 200, "GET /sitemap.xml returns 200");
  assert(sitemapText.startsWith("<?xml"), "sitemap.xml is well-formed XML (starts with declaration)");
  assert(sitemapText.includes("<urlset"), "sitemap.xml has a <urlset> root");
  assert(sitemapText.includes(`${BASE}/shop</loc>`), "sitemap.xml includes the shop page");
  const activeProductForSitemap = await prisma.product.findFirst({ where: { status: "ACTIVE" }, select: { slug: true } });
  if (activeProductForSitemap) {
    const urlBlocks = sitemapText.split("<url>").slice(1).map((b) => `<url>${b.split("</url>")[0]}</url>`);
    const block = urlBlocks.find((b) => b.includes(`/product/${activeProductForSitemap.slug}</loc>`));
    assert(!!block, `sitemap.xml includes active product /product/${activeProductForSitemap.slug}`);
    assert(!!block && block.includes("<lastmod>"), "sitemap.xml product entries carry <lastmod> from Product.updatedAt");
  } else {
    log("Skipped", "no ACTIVE product in DB to check sitemap product entry");
  }

  // --- Homepage: metadataBase-derived canonical + Organization + WebSite JSON-LD ---
  const homeRes = await fetch(`${BASE}/`);
  const homeHtml = await homeRes.text();
  assert(homeRes.status === 200, "GET / returns 200");
  const homeCanonical = extractCanonical(homeHtml);
  assert(homeCanonical === BASE || homeCanonical === `${BASE}/`, "Homepage canonical resolves to the site root");
  const homeJsonLd = extractJsonLd(homeHtml);
  const org = homeJsonLd.find((d) => d["@type"] === "Organization");
  const website = homeJsonLd.find((d) => d["@type"] === "WebSite");
  assert(!!org && !!org.name && !!org.url, "Homepage carries a valid Organization JSON-LD block");
  assert(!!website && website.potentialAction?.["@type"] === "SearchAction", "Homepage carries a WebSite JSON-LD block with a SearchAction");
  assert(website.potentialAction.target.includes("/shop?q="), "WebSite SearchAction target points at the real /shop search");

  // --- FAQ page ---
  const faqRes = await fetch(`${BASE}/faq`);
  const faqHtml = await faqRes.text();
  assert(extractCanonical(faqHtml) === `${BASE}/faq`, "FAQ page has a canonical tag");
  const faqJsonLd = extractJsonLd(faqHtml).find((d) => d["@type"] === "FAQPage");
  const faqSetting = await prisma.setting.findUnique({ where: { key: "store_faq" } });
  const enabledFaqCount = ((faqSetting?.value as { items?: { enabled: boolean }[] } | null)?.items ?? []).filter((i) => i.enabled).length;
  if (enabledFaqCount > 0) {
    assert(!!faqJsonLd && faqJsonLd.mainEntity.length === enabledFaqCount, "FAQ page carries FAQPage JSON-LD matching the visible, enabled FAQ items");
  } else {
    assert(!faqJsonLd, "FAQ page emits no FAQPage JSON-LD when there are no enabled FAQ items (never a superset of the DOM)");
  }

  // --- Static pages: every one gets its own canonical (Module 33 gap fix) ---
  const staticPages = ["/about", "/careers", "/categories", "/themes", "/collections", "/returns", "/shipping", "/contact"];
  for (const path of staticPages) {
    const res = await fetch(`${BASE}${path}`);
    const html = await res.text();
    assert(extractCanonical(html) === `${BASE}${path}`, `${path} has a self-referencing canonical tag`);
  }

  // --- Private pages: robots noindex must be present (indexing directive, not just robots.txt's crawl hint) ---
  const privatePages = ["/login", "/register", "/forgot-password", "/reset-password", "/cart", "/checkout"];
  for (const path of privatePages) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      log("Skipped (redirected)", `${path} → ${res.headers.get("location")}`);
      continue;
    }
    const html = await res.text();
    assert(hasRobotsNoindex(html), `${path} carries a noindex robots meta tag`);
  }

  // --- Custom 404 ---
  const notFoundRes = await fetch(`${BASE}/this-page-does-not-exist-${RUN_ID}`);
  const notFoundHtml = await notFoundRes.text();
  assert(notFoundRes.status === 404, "An unmatched route returns a real HTTP 404");
  assert(hasRobotsNoindex(notFoundHtml), "The custom 404 page carries a noindex robots meta tag");

  // --- Order confirmation: noindex even though it renders a 404 body for a bogus id ---
  const confirmRes = await fetch(`${BASE}/checkout/confirmation/does-not-exist-${RUN_ID}`);
  const confirmHtml = await confirmRes.text();
  assert(hasRobotsNoindex(confirmHtml), "/checkout/confirmation/[orderId] carries a noindex robots meta tag");

  // --- Category / theme detail pages: canonical, breadcrumb JSON-LD, noindex-on-filter ---
  const category = await prisma.category.findFirst({ where: { isVisible: true }, select: { slug: true } });
  if (category) {
    const res = await fetch(`${BASE}/categories/${category.slug}`);
    const html = await res.text();
    assert(extractCanonical(html) === `${BASE}/categories/${category.slug}`, "Category page canonical points at the clean base path");
    assert(extractJsonLd(html).some((d) => d["@type"] === "BreadcrumbList"), "Category page carries BreadcrumbList JSON-LD");
    const filteredRes = await fetch(`${BASE}/categories/${category.slug}?sort=price_asc`);
    const filteredHtml = await filteredRes.text();
    assert(hasRobotsNoindex(filteredHtml), "Category page with a query string is noindex");
    assert(extractCanonical(filteredHtml) === `${BASE}/categories/${category.slug}`, "Filtered category page canonical still points at the clean base path");
  } else {
    log("Skipped", "no visible category in DB");
  }

  // --- Product page: canonical, Product JSON-LD, aggregateRating truthfulness ---
  const productWithReviews = await prisma.product.findFirst({
    where: { status: "ACTIVE", reviews: { some: { isApproved: true } } },
    select: { slug: true },
  });
  const productToCheck = productWithReviews ?? (await prisma.product.findFirst({ where: { status: "ACTIVE" }, select: { slug: true } }));
  if (productToCheck) {
    const res = await fetch(`${BASE}/product/${productToCheck.slug}`);
    const html = await res.text();
    assert(extractCanonical(html) === `${BASE}/product/${productToCheck.slug}`, "Product page has a self-referencing canonical tag");
    const jsonLd = extractJsonLd(html);
    const productLd = jsonLd.find((d) => d["@type"] === "Product");
    assert(!!productLd && !!productLd.offers, "Product page carries valid Product JSON-LD with an Offer");
    assert(jsonLd.some((d) => d["@type"] === "BreadcrumbList"), "Product page carries BreadcrumbList JSON-LD");
    if (productWithReviews) {
      // Whether it actually appears also depends on the pre-existing
      // reviews-enabled site/product settings (out of this module's
      // scope) — the invariant this module owns is: IF present, it must
      // be truthful (a real count > 0), never fabricated or zero.
      if (productLd.aggregateRating) {
        assert(productLd.aggregateRating.reviewCount > 0 && productLd.aggregateRating.ratingValue > 0, "aggregateRating, when present, reflects a real, non-zero rating");
      } else {
        log("Note", "aggregateRating absent — reviews are gated off by site/product settings for this product, not an SEO defect");
      }
    } else {
      assert(!productLd.aggregateRating, "Product with zero reviews carries no aggregateRating (never fabricated)");
    }
  } else {
    log("Skipped", "no ACTIVE product in DB");
  }

  // --- Module 32 preservation: old product slugs still 308 after this module's changes ---
  log("Module 32 check", "creating a throwaway QA product to exercise the slug-redirect path end to end");
  const category2 = await prisma.category.findFirst({ select: { id: true } });
  if (!category2) throw new Error("No category exists in DB — cannot create QA product for redirect check");
  const adminCookie = await adminLogin();

  const oldSlug = `qa-seo-redirect-${RUN_ID}-old`;
  const newSlug = `qa-seo-redirect-${RUN_ID}-new`;
  const createRes = await fetch(`${BASE}/api/admin/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: `QA SEO Redirect Test ${RUN_ID}`,
      slug: oldSlug,
      description: "Temporary QA product for Module 33's SEO regression script — deleted at the end of the run.",
      price: "999.00",
      sku: `QA-SEO-${RUN_ID}`,
      categoryId: category2.id,
      status: "ACTIVE",
    }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok || !createJson.success) throw new Error(`QA product creation failed: ${JSON.stringify(createJson)}`);
  const qaProductId = createJson.data.id as string;
  log("QA product created", { qaProductId, oldSlug });

  const renameRes = await fetch(`${BASE}/api/admin/products/${qaProductId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ slug: newSlug }),
  });
  const renameJson = await renameRes.json();
  if (!renameRes.ok || !renameJson.success) throw new Error(`QA product rename failed: ${JSON.stringify(renameJson)}`);

  const redirectCheck = await fetch(`${BASE}/product/${oldSlug}`, { redirect: "manual" });
  assert(redirectCheck.status === 308, "Visiting the OLD product slug returns an HTTP 308 permanent redirect");
  const location = redirectCheck.headers.get("location") || "";
  assert(location.endsWith(`/product/${newSlug}`), "The 308 redirect points at the product's CURRENT slug");

  const newSlugRes = await fetch(`${BASE}/product/${newSlug}`);
  assert(newSlugRes.status === 200, "The new slug resolves directly (200, no redirect)");

  console.log("\n✅ All Module 33 SEO regression checks passed.");

  if (!KEEP) {
    // ActivityLog.entityId is a plain string, not a real FK (see
    // schema.prisma) — deleting the product does NOT cascade to the
    // product.created/product.updated rows logActivity() wrote for it
    // (Module 34 finding: this script's own cleanup was leaving those
    // behind on every run). Removed explicitly, same as the product itself.
    const delActivity = await prisma.activityLog.deleteMany({ where: { entity: "Product", entityId: qaProductId } });
    const delProduct = await prisma.product.deleteMany({ where: { id: qaProductId } });
    log("Cleanup: QA product removed (ProductSlugRedirect rows cascade)", delProduct.count);
    log("Cleanup: ActivityLog rows removed", delActivity.count);
  } else {
    log("Cleanup skipped (--keep)", { qaProductId, oldSlug, newSlug });
  }
}

main()
  .catch((err) => {
    console.error("\n❌ SEO simulation failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
