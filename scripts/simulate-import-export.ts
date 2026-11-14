/**
 * Module 41 Part B — regression + security harness for the Excel
 * import/export system (product import/export, inventory import/export,
 * category SEO import/export, theme export, product image import/export).
 * Same pattern as every other simulate-*.ts script in this project:
 * exercises the REAL running app + REAL local database over HTTP, self-
 * cleaning QA data, admin login via the real /api/auth/login route,
 * test body and cleanup run in separate try/catch blocks so a failed
 * assertion never prevents cleanup and a cleanup failure is never masked.
 *
 * Covers:
 *   - Authorization matrix (401 unauthenticated / 403 CUSTOMER) across
 *     every new and existing import/export route
 *   - Product import CREATE + UPDATE + error rows (duplicate SKU, unknown
 *     category, invalid price), via a real generated .xlsx uploaded through
 *     the real /parse endpoint, then applied through /apply
 *   - Product export produces a valid workbook containing the QA product
 *   - Formula-injection protection: a product named "=2+2 ..." is exported
 *     without its cell evaluating as a formula
 *   - Inventory import signed adjustment (+10), negative-stock rejection,
 *     unknown-SKU rejection, verified against the real StockMovement table
 *   - Inventory export reflects current stock
 *   - Category SEO import (update + "-" clear convention + unknown-slug
 *     error), restored to its exact original value afterward
 *   - Category export and Theme export produce valid workbooks
 *   - Product image import CREATE + UNCHANGED + UPDATE + invalid-purpose
 *     error, and product image export
 *   - Full QA data cleanup with before/after DB count comparison
 *
 * Requires: `npm run dev` running locally, and a SUPER_ADMIN account
 * (defaults to admin@kutir.in / Admin@12345 — override with
 * ADMIN_EMAIL/ADMIN_PASSWORD).
 *
 * Usage:
 *   npm run simulate:import-export
 *   npm run simulate:import-export -- --keep   (skip cleanup)
 */
import ExcelJS from "exceljs";
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

async function xlsxBufferFromRows(sheetName: string, columns: { key: string; header: string }[], rows: Record<string, string>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key }));
  rows.forEach((r) => sheet.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function uploadParse(path: string, cookie: string | null, buffer: Buffer, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
  return fetch(`${BASE}${path}`, { method: "POST", headers: { ...(cookie ? { Cookie: cookie } : {}) }, body: form });
}
function applyJson(path: string, cookie: string | null, rawRows: Record<string, string>[]) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ rawRows }),
  });
}

const CUSTOMER_EMAIL = `qa-ie-customer-${RUN_ID}@example.test`;
const QA_SKU = `QA-IE-${RUN_ID}`;
// Deliberately starts with "=" — doubles as the formula-injection test
// subject (EXPORT-004): a product name an attacker (or an innocently
// odd real product name) could use to try to get Excel to evaluate a
// formula when the export is opened.
const QA_PRODUCT_NAME = `=2+2 QA Import-Export Test ${RUN_ID}`;
const QA_IMAGE_URL = `https://example.com/qa-ie-${RUN_ID}-a.jpg`;

async function tableCounts() {
  const [products, productImages, stockMovements, activityLogs, users] = await Promise.all([
    prisma.product.count(),
    prisma.productImage.count(),
    prisma.stockMovement.count(),
    prisma.activityLog.count(),
    prisma.user.count(),
  ]);
  return { products, productImages, stockMovements, activityLogs, users };
}

interface RunState {
  qaProductId: string | null;
  qaCategorySlug: string | null;
  originalCategorySeo: { seoTitle: string | null; seoDesc: string | null } | undefined;
  categoryMutated: boolean;
  adminId: string | null;
  testStartTime: Date;
}

async function runTest(state: RunState) {
  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!admin) throw new Error("Seeded admin account not found");
  state.adminId = admin.id;

  const customerCookie = await register(CUSTOMER_EMAIL, `QA IE Customer ${RUN_ID}`);

  const categoriesRes = await fetch(`${BASE}/api/categories`);
  const categoriesJson = await categoriesRes.json();
  const categorySlug: string | undefined = categoriesJson?.data?.categories?.[0]?.slug;
  if (!categorySlug) throw new Error("No category available locally to run this test against — seed at least one category.");
  state.qaCategorySlug = categorySlug;

  // ============================================================
  // Part 1 — authorization matrix across every import/export route
  // ============================================================
  log("Part 1", "authorization matrix (401 unauthenticated, 403 CUSTOMER)");
  const GET_ROUTES = [
    "/api/admin/inventory/export",
    "/api/admin/categories/export",
    "/api/admin/themes/export",
    "/api/admin/products/images/export",
    "/api/admin/products/export",
  ];
  let n = 1;
  for (const route of GET_ROUTES) {
    const unauth = await fetch(`${BASE}${route}`);
    assert(unauth.status === 401, `${n}. GET ${route} unauthenticated -> 401`);
    n++;
    const asCustomer = await fetch(`${BASE}${route}`, { headers: { Cookie: customerCookie } });
    assert(asCustomer.status === 403, `${n}. GET ${route} as CUSTOMER -> 403`);
    n++;
  }
  const POST_PARSE_ROUTES = [
    "/api/admin/categories/import/parse",
    "/api/admin/products/images/import/parse",
    "/api/admin/products/import/parse",
    "/api/admin/inventory/import/parse",
  ];
  const dummyXlsx = await xlsxBufferFromRows("x", [{ key: "a", header: "A" }], [{ a: "1" }]);
  for (const route of POST_PARSE_ROUTES) {
    const unauth = await uploadParse(route, null, dummyXlsx, "x.xlsx");
    assert(unauth.status === 401, `${n}. POST ${route} unauthenticated -> 401`);
    n++;
    const asCustomer = await uploadParse(route, customerCookie, dummyXlsx, "x.xlsx");
    assert(asCustomer.status === 403, `${n}. POST ${route} as CUSTOMER -> 403`);
    n++;
  }

  // ============================================================
  // Part 2 — product import: CREATE, UPDATE, error rows
  // ============================================================
  log("Part 2", "product import CREATE via real .xlsx upload + /parse + /apply");
  const PRODUCT_COLUMNS = [
    { key: "sku", header: "SKU" }, { key: "name", header: "Product Name" }, { key: "slug", header: "Slug" },
    { key: "description", header: "Description" }, { key: "price", header: "Price" }, { key: "compareAtPrice", header: "Compare At Price" },
    { key: "stock", header: "Stock" }, { key: "lowStockThreshold", header: "Low Stock Threshold" }, { key: "status", header: "Status" },
    { key: "categorySlug", header: "Category" }, { key: "themeSlug", header: "Theme" },
  ];
  const createRow = { sku: QA_SKU, name: QA_PRODUCT_NAME, slug: `qa-ie-${RUN_ID}`, description: "QA import-export test product.", price: "500", compareAtPrice: "", stock: "0", lowStockThreshold: "5", status: "DRAFT", categorySlug, themeSlug: "" };

  const createXlsx = await xlsxBufferFromRows("Products", PRODUCT_COLUMNS, [createRow]);
  const parseRes = await uploadParse("/api/admin/products/import/parse", adminCookie, createXlsx, "products.xlsx");
  assert(parseRes.status === 200, "3. Product import /parse succeeds on a real .xlsx upload");
  const parseJson = await parseRes.json();
  assert(parseJson.data.summary.create === 1 && parseJson.data.summary.error === 0, "4. New SKU classified CREATE with zero errors");

  const applyRes = await applyJson("/api/admin/products/import/apply", adminCookie, parseJson.data.rawRows);
  const applyJsonBody = await applyRes.json();
  assert(applyRes.status === 200 && applyJsonBody.data.created === 1, "5. Product import /apply creates exactly 1 product");

  const created = await prisma.product.findUnique({ where: { sku: QA_SKU } });
  assert(!!created, "6. QA product exists in the database with the exact submitted SKU");
  state.qaProductId = created!.id;
  assert(created!.name === QA_PRODUCT_NAME, "7. QA product name stored exactly as submitted (including leading '=')");
  assert(created!.status === "DRAFT", "8. QA product created as DRAFT (never publicly listed)");

  log("Part 2b", "product import UPDATE row + blank-cell-preserves-value");
  const updateRow = { sku: QA_SKU, name: "", slug: "", description: "", price: "600", compareAtPrice: "", stock: "", lowStockThreshold: "", status: "", categorySlug: "", themeSlug: "" };
  const updateXlsx = await xlsxBufferFromRows("Products", PRODUCT_COLUMNS, [updateRow]);
  const updateParseRes = await uploadParse("/api/admin/products/import/parse", adminCookie, updateXlsx, "products.xlsx");
  const updateParseJson = await updateParseRes.json();
  assert(updateParseJson.data.summary.update === 1, "9. Existing SKU with a changed price classified UPDATE");
  const updateApplyRes = await applyJson("/api/admin/products/import/apply", adminCookie, updateParseJson.data.rawRows);
  const updateApplyJson = await updateApplyRes.json();
  assert(updateApplyRes.status === 200 && updateApplyJson.data.updated === 1, "10. Product import /apply updates exactly 1 product");
  const afterUpdate = await prisma.product.findUnique({ where: { sku: QA_SKU } });
  assert(afterUpdate!.price.toString() === "600.00" || Number(afterUpdate!.price) === 600, "11. Price updated to 600");
  assert(afterUpdate!.name === QA_PRODUCT_NAME, "12. Blank Name cell left the name unchanged (blank-cell-preserves-value rule)");

  log("Part 2c", "product import error rows (invalid price, unknown category, duplicate SKU in file)");
  const errorRows = [
    { ...createRow, sku: `${QA_SKU}-BADPRICE`, price: "-5" },
    { ...createRow, sku: `${QA_SKU}-BADCAT`, categorySlug: `does-not-exist-${RUN_ID}` },
    { ...createRow, sku: `${QA_SKU}-DUP` },
    { ...createRow, sku: `${QA_SKU}-DUP` },
  ];
  const errorParseRes = await uploadParse("/api/admin/products/import/parse", adminCookie, await xlsxBufferFromRows("Products", PRODUCT_COLUMNS, errorRows), "err.xlsx");
  const errorParseJson = await errorParseRes.json();
  assert(errorParseJson.data.summary.error === 4, "13. Invalid price, unknown category, and duplicate-in-file SKU all classified ERROR (4 rows)");
  const badPriceProduct = await prisma.product.findUnique({ where: { sku: `${QA_SKU}-BADPRICE` } });
  assert(!badPriceProduct, "14. No product was written for the invalid-price row (validate-only, never partially applied)");

  // ============================================================
  // Part 3 — product export + formula-injection protection
  // ============================================================
  log("Part 3", "product export + formula-injection protection (EXPORT-004)");
  const exportRes = await fetch(`${BASE}/api/admin/products/export?scope=selected&ids=${state.qaProductId}&format=xlsx`, { headers: { Cookie: adminCookie } });
  assert(exportRes.status === 200, "15. Product export succeeds for the QA product");
  const exportBuf = Buffer.from(await exportRes.arrayBuffer());
  const exportWb = new ExcelJS.Workbook();
  await exportWb.xlsx.load(exportBuf);
  const exportSheet = exportWb.worksheets[0];
  assert(!!exportSheet && exportSheet.rowCount === 2, "16. Exported workbook has exactly 1 header row + 1 data row");
  const nameCell = exportSheet!.getRow(2).getCell(3); // column 3 = Product Name per EXPORT_COLUMNS order
  const nameCellValue = String(nameCell.value ?? "");
  assert(nameCell.type !== ExcelJS.ValueType.Formula, "17. Product Name cell is NOT stored as an Excel formula type");
  assert(nameCellValue.startsWith("'"), "18. Product Name cell value is prefixed with a leading apostrophe (formula-injection guard applied)");
  assert(nameCellValue.includes(QA_PRODUCT_NAME), "19. Sanitized cell still contains the original text content (only display-safety changed, not the data)");

  // ============================================================
  // Part 4 — inventory import (signed adjustment) + export
  // ============================================================
  log("Part 4", "inventory import: +10 purchase, negative-stock rejection, unknown SKU");
  // Header must be literally "Quantity" (case-insensitive) — inventory-import.ts's
  // parser lowercases the header text directly with no header->key mapping
  // table (unlike product-import.ts's HEADER_TO_KEY), so the column name
  // must match validateInventoryImportRows()'s row.quantity field exactly.
  const INV_COLUMNS = [{ key: "sku", header: "SKU" }, { key: "quantity", header: "Quantity" }, { key: "reason", header: "Reason" }, { key: "notes", header: "Notes" }];
  const invParseRes = await uploadParse("/api/admin/inventory/import/parse", adminCookie, await xlsxBufferFromRows("Inventory", INV_COLUMNS, [{ sku: QA_SKU, quantity: "+10", reason: "purchase", notes: `QA run ${RUN_ID}` }]), "inv.xlsx");
  const invParseJson = await invParseRes.json();
  assert(invParseJson.data.summary.valid === 1, "20. +10 purchase row validates cleanly");
  const invApplyRes = await applyJson("/api/admin/inventory/import/apply", adminCookie, invParseJson.data.rawRows);
  const invApplyJson = await invApplyRes.json();
  assert(invApplyRes.status === 200 && invApplyJson.data.applied === 1, "21. Inventory import /apply applies exactly 1 adjustment");
  const afterAdjust = await prisma.product.findUnique({ where: { sku: QA_SKU } });
  assert(afterAdjust!.stockAvailable === 10, "22. QA product stock is exactly 10 after the +10 adjustment");
  const movement = await prisma.stockMovement.findFirst({ where: { productId: state.qaProductId!, reason: "purchase" } });
  assert(!!movement && movement.change === 10, "23. A StockMovement row (reason=purchase, change=+10) was recorded");

  const negParseRes = await uploadParse("/api/admin/inventory/import/parse", adminCookie, await xlsxBufferFromRows("Inventory", INV_COLUMNS, [{ sku: QA_SKU, quantity: "-999", reason: "correction", notes: "" }]), "inv2.xlsx");
  const negParseJson = await negParseRes.json();
  assert(negParseJson.data.summary.error === 1, "24. An adjustment that would take stock below zero is rejected at validation");

  const unknownParseRes = await uploadParse("/api/admin/inventory/import/parse", adminCookie, await xlsxBufferFromRows("Inventory", INV_COLUMNS, [{ sku: `NOPE-${RUN_ID}`, quantity: "+1", reason: "purchase", notes: "" }]), "inv3.xlsx");
  const unknownParseJson = await unknownParseRes.json();
  assert(unknownParseJson.data.summary.error === 1, "25. Unknown SKU rejected at validation");

  log("Part 4b", "inventory export reflects current stock");
  const invExportRes = await fetch(`${BASE}/api/admin/inventory/export?format=xlsx`, { headers: { Cookie: adminCookie } });
  assert(invExportRes.status === 200, "26. Inventory export succeeds");
  const invExportWb = new ExcelJS.Workbook();
  await invExportWb.xlsx.load(Buffer.from(await invExportRes.arrayBuffer()));
  const invRows = invExportWb.worksheets[0]!.getSheetValues() as unknown[][];
  const qaInvRow = invRows.find((r) => Array.isArray(r) && String(r[1]) === QA_SKU);
  assert(!!qaInvRow && String(qaInvRow[4]) === "10", "27. Inventory export shows the QA SKU with Current Stock = 10");

  // ============================================================
  // Part 5 — category SEO import (update + clear) + export
  // ============================================================
  log("Part 5", "category SEO import");
  const categoryRow = await prisma.category.findUnique({ where: { slug: categorySlug } });
  state.originalCategorySeo = { seoTitle: categoryRow!.seoTitle, seoDesc: categoryRow!.seoDesc };
  log("Category SEO baseline captured", state.originalCategorySeo);

  const CAT_COLUMNS = [{ key: "slug", header: "Slug" }, { key: "seoTitle", header: "SEO Title" }, { key: "seoDesc", header: "SEO Description" }];
  const catUpdateParse = await uploadParse("/api/admin/categories/import/parse", adminCookie, await xlsxBufferFromRows("Categories", CAT_COLUMNS, [{ slug: categorySlug, seoTitle: `QA SEO Title ${RUN_ID}`, seoDesc: `QA SEO Desc ${RUN_ID}` }]), "cat.xlsx");
  const catUpdateParseJson = await catUpdateParse.json();
  assert(catUpdateParseJson.data.summary.update === 1, "28. Category SEO row classified UPDATE");
  state.categoryMutated = true; // from this point on, cleanup MUST attempt restoration regardless of what happens next
  const catUpdateApply = await applyJson("/api/admin/categories/import/apply", adminCookie, catUpdateParseJson.data.rawRows);
  const catUpdateApplyJson = await catUpdateApply.json();
  assert(catUpdateApply.status === 200 && catUpdateApplyJson.data.updated === 1, "29. Category SEO import /apply updates exactly 1 category");
  const afterCatUpdate = await prisma.category.findUnique({ where: { slug: categorySlug } });
  assert(afterCatUpdate!.seoTitle === `QA SEO Title ${RUN_ID}`, "30. Category seoTitle updated to the submitted value");

  const clearParse = await uploadParse("/api/admin/categories/import/parse", adminCookie, await xlsxBufferFromRows("Categories", CAT_COLUMNS, [{ slug: categorySlug, seoTitle: "-", seoDesc: "" }]), "cat2.xlsx");
  const clearParseJson = await clearParse.json();
  const clearApply = await applyJson("/api/admin/categories/import/apply", adminCookie, clearParseJson.data.rawRows);
  const clearApplyJson = await clearApply.json();
  assert(clearApply.status === 200 && clearApplyJson.data.updated === 1, "31. \"-\" token clears seoTitle (blank seoDesc cell leaves seoDesc unchanged)");
  const afterClear = await prisma.category.findUnique({ where: { slug: categorySlug } });
  assert(afterClear!.seoTitle === null, "32. seoTitle is now null after the \"-\" clear token");
  assert(afterClear!.seoDesc === `QA SEO Desc ${RUN_ID}`, "33. seoDesc untouched by the blank cell (left at its previously-set QA value)");

  const unknownSlugParse = await uploadParse("/api/admin/categories/import/parse", adminCookie, await xlsxBufferFromRows("Categories", CAT_COLUMNS, [{ slug: `no-such-category-${RUN_ID}`, seoTitle: "x", seoDesc: "x" }]), "cat3.xlsx");
  const unknownSlugJson = await unknownSlugParse.json();
  assert(unknownSlugJson.data.summary.error === 1, "34. Unknown category slug rejected at validation");

  log("Part 5b", "category export + theme export produce valid workbooks");
  const catExportRes = await fetch(`${BASE}/api/admin/categories/export?format=xlsx`, { headers: { Cookie: adminCookie } });
  assert(catExportRes.status === 200, "35. Category export succeeds");
  const catExportWb = new ExcelJS.Workbook();
  await catExportWb.xlsx.load(Buffer.from(await catExportRes.arrayBuffer()));
  assert(catExportWb.worksheets[0]!.rowCount >= 2, "36. Category export contains at least one data row");

  const themeExportRes = await fetch(`${BASE}/api/admin/themes/export?format=xlsx`, { headers: { Cookie: adminCookie } });
  assert(themeExportRes.status === 200, "37. Theme export succeeds");
  const themeExportWb = new ExcelJS.Workbook();
  await themeExportWb.xlsx.load(Buffer.from(await themeExportRes.arrayBuffer()));
  assert(themeExportWb.worksheets[0]!.rowCount >= 1, "38. Theme export workbook loads correctly");

  // ============================================================
  // Part 6 — product image import (CREATE, UNCHANGED, UPDATE, error) + export
  // ============================================================
  log("Part 6", "product image import");
  const IMG_COLUMNS = [{ key: "sku", header: "SKU" }, { key: "imageUrl", header: "Image URL" }, { key: "altText", header: "Alt Text" }, { key: "sortOrder", header: "Sort Order" }, { key: "purpose", header: "Purpose" }];
  const imgCreateRow = { sku: QA_SKU, imageUrl: QA_IMAGE_URL, altText: "QA alt text", sortOrder: "0", purpose: "PRODUCT" };

  const imgCreateParse = await uploadParse("/api/admin/products/images/import/parse", adminCookie, await xlsxBufferFromRows("Images", IMG_COLUMNS, [imgCreateRow]), "img.xlsx");
  const imgCreateParseJson = await imgCreateParse.json();
  assert(imgCreateParseJson.data.summary.create === 1, "39. New (SKU, Image URL) pair classified CREATE");
  const imgCreateApply = await applyJson("/api/admin/products/images/import/apply", adminCookie, imgCreateParseJson.data.rawRows);
  const imgCreateApplyJson = await imgCreateApply.json();
  assert(imgCreateApply.status === 200 && imgCreateApplyJson.data.created === 1, "40. Product image import /apply creates exactly 1 image");
  const createdImage = await prisma.productImage.findFirst({ where: { productId: state.qaProductId!, url: QA_IMAGE_URL } });
  assert(!!createdImage, "41. QA image exists with the exact submitted URL");

  const imgUnchangedParse = await uploadParse("/api/admin/products/images/import/parse", adminCookie, await xlsxBufferFromRows("Images", IMG_COLUMNS, [imgCreateRow]), "img2.xlsx");
  const imgUnchangedParseJson = await imgUnchangedParse.json();
  assert(imgUnchangedParseJson.data.summary.unchanged === 1, "42. Re-submitting the identical row is classified UNCHANGED (no duplicate created)");
  assert((await prisma.productImage.count({ where: { productId: state.qaProductId!, url: QA_IMAGE_URL } })) === 1, "43. Still exactly 1 image row for that URL — no duplicate");

  const imgUpdateRow = { ...imgCreateRow, altText: "QA alt text UPDATED" };
  const imgUpdateParse = await uploadParse("/api/admin/products/images/import/parse", adminCookie, await xlsxBufferFromRows("Images", IMG_COLUMNS, [imgUpdateRow]), "img3.xlsx");
  const imgUpdateParseJson = await imgUpdateParse.json();
  assert(imgUpdateParseJson.data.summary.update === 1, "44. Changed Alt Text on an existing (SKU, URL) classified UPDATE");
  const imgUpdateApply = await applyJson("/api/admin/products/images/import/apply", adminCookie, imgUpdateParseJson.data.rawRows);
  const imgUpdateApplyJson = await imgUpdateApply.json();
  assert(imgUpdateApply.status === 200 && imgUpdateApplyJson.data.updated === 1, "45. Product image import /apply updates exactly 1 image");
  const afterImgUpdate = await prisma.productImage.findFirst({ where: { productId: state.qaProductId!, url: QA_IMAGE_URL } });
  assert(afterImgUpdate!.altText === "QA alt text UPDATED", "46. Alt Text updated, URL unchanged");

  const badPurposeParse = await uploadParse("/api/admin/products/images/import/parse", adminCookie, await xlsxBufferFromRows("Images", IMG_COLUMNS, [{ ...imgCreateRow, imageUrl: `${QA_IMAGE_URL}-bad`, purpose: "NOT_A_REAL_PURPOSE" }]), "img4.xlsx");
  const badPurposeJson = await badPurposeParse.json();
  assert(badPurposeJson.data.summary.error === 1, "47. Invalid Purpose value rejected at validation");

  log("Part 6b", "product image export");
  const imgExportRes = await fetch(`${BASE}/api/admin/products/images/export?format=xlsx`, { headers: { Cookie: adminCookie } });
  assert(imgExportRes.status === 200, "48. Product image export succeeds");
  const imgExportWb = new ExcelJS.Workbook();
  await imgExportWb.xlsx.load(Buffer.from(await imgExportRes.arrayBuffer()));
  const imgRows = imgExportWb.worksheets[0]!.getSheetValues() as unknown[][];
  assert(imgRows.some((r) => Array.isArray(r) && String(r[1]) === QA_SKU), "49. Product image export contains the QA product's image row");
}

async function cleanup(state: RunState, beforeCounts: Awaited<ReturnType<typeof tableCounts>>) {
  // Restore category SEO FIRST, before deleting anything else, mirroring
  // this project's established "reverse the real mutation before touching
  // QA audit rows" ordering (Module 35/36/40 discipline).
  if (state.categoryMutated && state.qaCategorySlug && state.originalCategorySeo !== undefined) {
    await prisma.category.update({
      where: { slug: state.qaCategorySlug },
      data: { seoTitle: state.originalCategorySeo.seoTitle, seoDesc: state.originalCategorySeo.seoDesc },
    });
    const verify = await prisma.category.findUnique({ where: { slug: state.qaCategorySlug } });
    if (verify?.seoTitle !== state.originalCategorySeo.seoTitle || verify?.seoDesc !== state.originalCategorySeo.seoDesc) {
      throw new Error("Category SEO restoration VERIFICATION FAILED — manual review required.");
    }
    log("Category SEO restored to its exact pre-test values", state.originalCategorySeo);
  } else {
    log("Category SEO restoration skipped", "never mutated this run");
  }

  // QA product delete cascades ProductImage, StockMovement, ProductAttribute
  // rows for it (schema onDelete: Cascade) — safe because this product was
  // created fresh by this run, kept DRAFT throughout, and never referenced
  // by any Order/CartItem/WishlistItem. This is the same "delete a purely
  // QA-created fixture directly" judgment used for QA users/pages/orders
  // in every prior module's simulator.
  const delProduct = state.qaProductId ? await prisma.product.deleteMany({ where: { id: state.qaProductId } }) : { count: 0 };
  const delCustomer = await prisma.user.deleteMany({ where: { email: CUSTOMER_EMAIL } });

  // Aggregate ActivityLog rows this run's import/apply calls created —
  // scoped by action name AND createdAt >= this run's own start time AND
  // the admin's own userId, never a bare action-name filter (Module 40's
  // notification-cleanup bug taught this project exactly why a bare filter
  // is unsafe: it would delete every OTHER admin's real import history too).
  const delActivity = state.adminId
    ? await prisma.activityLog.deleteMany({
        where: {
          userId: state.adminId,
          action: { in: ["product.imported", "category.seo_imported", "product_image.imported"] },
          createdAt: { gte: state.testStartTime },
        },
      })
    : { count: 0 };

  const afterCounts = await tableCounts();
  log("Cleanup", {
    qaProductDeleted: delProduct.count,
    qaCustomerDeleted: delCustomer.count,
    activityLogRowsDeleted: delActivity.count,
  });
  log("DB counts after", afterCounts);

  const countsMatch =
    beforeCounts.products === afterCounts.products &&
    beforeCounts.productImages === afterCounts.productImages &&
    beforeCounts.stockMovements === afterCounts.stockMovements &&
    beforeCounts.users === afterCounts.users;
  if (!countsMatch) {
    throw new Error(`Post-cleanup DB counts do not match the pre-test baseline. before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`);
  }
  console.log("  ✓ 50. Database counts (products/productImages/stockMovements/users) match the pre-test baseline exactly — zero QA residue");
}

async function main() {
  log("Config", { BASE, ADMIN_EMAIL, RUN_ID, KEEP });

  const beforeCounts = await tableCounts();
  log("DB counts before", beforeCounts);

  const state: RunState = {
    qaProductId: null, qaCategorySlug: null, originalCategorySeo: undefined,
    categoryMutated: false, adminId: null, testStartTime: new Date(),
  };

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
    log("Cleanup skipped (--keep)", { qaProductId: state.qaProductId, CUSTOMER_EMAIL });
  }

  if (testError) console.error("\n❌ Import/export simulation failed:", testError);
  if (cleanupError) console.error("\n❌ CLEANUP FAILED — state may be inconsistent, manual review required:", cleanupError);
  if (testError || cleanupError) process.exitCode = 1;
  else console.log("\n✅ Import/export simulation passed — zero QA residue.");
}

main().finally(async () => {
  await prisma.$disconnect();
});
