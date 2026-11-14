/**
 * Module 41 Part B — generates the real, physical .xlsx template files under
 * docs/import-export/. These are static REFERENCE workbooks (format +
 * instructions + fictional example rows), not live database snapshots —
 * the live, always-current data is what the app's own export API routes
 * return when an admin actually clicks Export (e.g. /api/admin/products/export,
 * /api/admin/inventory/export). A docs/ file that captured a live snapshot
 * would go stale the moment a product changes, so instead every *_Export_
 * Template.xlsx here documents the exact column format an admin will get
 * from the real export, with example values — the same "format sample with
 * fictional demo rows" approach the pre-existing
 * generateProductImportTemplate() (Module 34) already established for
 * Product_Import_Template.xlsx, which this script reuses unchanged.
 *
 * Run with: npx tsx scripts/generate-templates.ts
 */
import ExcelJS from "exceljs";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

// Every src/lib/admin/*.ts file this script would otherwise import is
// tagged "server-only", which throws unconditionally outside a Next.js
// server render (Next's bundler strips it there; plain tsx/node has no such
// strip). The same reason every scripts/simulate-*.ts talks to the running
// app over HTTP instead of importing server-only libs directly. This script
// only needs the small, static COLUMN NAME lists (not any business logic),
// so those are inlined below, each annotated with its true source of truth
// to avoid silent drift if a column is ever renamed there.

// Source of truth: src/lib/admin/product-export.ts EXPORT_COLUMNS
const PRODUCT_EXPORT_COLUMNS = [
  { key: "productId", header: "Product ID" }, { key: "sku", header: "SKU" }, { key: "name", header: "Product Name" },
  { key: "slug", header: "Slug" }, { key: "description", header: "Description" }, { key: "price", header: "Price" },
  { key: "compareAtPrice", header: "Compare At Price" }, { key: "stock", header: "Stock" }, { key: "lowStockThreshold", header: "Low Stock Threshold" },
  { key: "status", header: "Status" }, { key: "categorySlug", header: "Category" }, { key: "themeSlug", header: "Theme" },
  { key: "material", header: "Material" }, { key: "color", header: "Color" }, { key: "width", header: "Width" },
  { key: "height", header: "Height" }, { key: "careInstructions", header: "Care Instructions" }, { key: "newArrival", header: "New Arrival" },
  { key: "bestSeller", header: "Best Seller" }, { key: "trending", header: "Trending" }, { key: "featured", header: "Featured" },
] as const;

// Source of truth: src/lib/admin/inventory-export.ts INVENTORY_EXPORT_COLUMNS
const INVENTORY_EXPORT_COLUMNS = [
  { key: "sku", header: "SKU" }, { key: "name", header: "Product Name" }, { key: "categorySlug", header: "Category" },
  { key: "currentStock", header: "Current Stock" }, { key: "lowStockThreshold", header: "Low Stock Threshold" },
  { key: "stockStatus", header: "Stock Status" }, { key: "status", header: "Product Status" },
] as const;

// Source of truth: src/lib/admin/category-export.ts CATEGORY_EXPORT_COLUMNS
const CATEGORY_EXPORT_COLUMNS = [
  { key: "categoryId", header: "Category ID" }, { key: "name", header: "Name" }, { key: "slug", header: "Slug" },
  { key: "description", header: "Description" }, { key: "image", header: "Image URL" }, { key: "parentSlug", header: "Parent Category" },
  { key: "sortOrder", header: "Sort Order" }, { key: "isVisible", header: "Visible" }, { key: "seoTitle", header: "SEO Title" },
  { key: "seoDesc", header: "SEO Description" },
] as const;

// Source of truth: src/lib/admin/theme-export.ts THEME_EXPORT_COLUMNS
const THEME_EXPORT_COLUMNS = [
  { key: "themeId", header: "Theme ID" }, { key: "name", header: "Name" }, { key: "slug", header: "Slug" },
  { key: "description", header: "Description" }, { key: "banner", header: "Banner Image URL" },
  { key: "sortOrder", header: "Sort Order" }, { key: "isEnabled", header: "Enabled" },
] as const;

// Source of truth: src/lib/admin/product-image-export.ts PRODUCT_IMAGE_EXPORT_COLUMNS
const PRODUCT_IMAGE_EXPORT_COLUMNS = [
  { key: "sku", header: "SKU" }, { key: "productName", header: "Product Name" }, { key: "imageUrl", header: "Image URL" },
  { key: "altText", header: "Alt Text" }, { key: "sortOrder", header: "Sort Order" },
  { key: "isPrimary", header: "Primary Image (sortOrder=0)" }, { key: "purpose", header: "Purpose" },
] as const;

// Source of truth: src/lib/inventory/stock-service.ts STOCK_ADJUSTMENT_REASONS
const STOCK_ADJUSTMENT_REASONS = ["purchase", "restock", "damage", "lost", "correction", "return", "other"] as const;

const OUT_DIR = path.join(__dirname, "..", "docs", "import-export");
mkdirSync(OUT_DIR, { recursive: true });

type Col = { key: string; header: string };

function styleHeader(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

function addDataSheet(wb: ExcelJS.Workbook, name: string, columns: readonly Col[], rows: Record<string, string>[], widths = 22) {
  const sheet = wb.addWorksheet(name);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: widths }));
  rows.forEach((r) => sheet.addRow(r));
  styleHeader(sheet);
  return sheet;
}

function addInstructionsSheet(wb: ExcelJS.Workbook, rows: { heading: string; body: string }[]) {
  const sheet = wb.addWorksheet("Instructions");
  sheet.columns = [
    { header: "Topic", key: "heading", width: 32 },
    { header: "Details", key: "body", width: 110 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => {
    const added = sheet.addRow(row);
    added.alignment = { wrapText: true, vertical: "top" };
  });
  return sheet;
}

function addAllowedValuesSheet(wb: ExcelJS.Workbook, columns: { field: string; values: string }[]) {
  const sheet = wb.addWorksheet("Allowed Values");
  sheet.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Allowed Values", key: "values", width: 90 },
  ];
  sheet.getRow(1).font = { bold: true };
  columns.forEach((c) => sheet.addRow(c));
  return sheet;
}

function addDropdown(sheet: ExcelJS.Worksheet, colLetter: string, firstRow: number, lastRow: number, values: readonly string[]) {
  for (let r = firstRow; r <= lastRow; r++) {
    sheet.getCell(`${colLetter}${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${values.join(",")}"`],
    };
  }
}

async function writeWb(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  writeFileSync(path.join(OUT_DIR, filename), Buffer.from(buf));
  console.log(`  wrote ${filename} (${Buffer.from(buf).length} bytes)`);
}

async function main() {
  console.log("Generating Module 41 Part B Excel templates into", OUT_DIR);

  // 1. Product_Import_Template.xlsx — the app's own live generator is
  // GET /api/admin/products/import/template (unchanged by this module,
  // src/lib/admin/product-import-template.ts). This static docs/ copy
  // mirrors its exact same two example rows and instructions text so the
  // file in docs/import-export/ always matches what Admin > Products >
  // Import actually downloads.
  {
    const wb = new ExcelJS.Workbook();
    const sheet = addDataSheet(wb, "Product Import Template", PRODUCT_EXPORT_COLUMNS, [
      { productId: "", sku: "DEMO-0001", name: "Demo Handwoven Jute Rug (fictional — do not import as-is)", slug: "demo-handwoven-jute-rug", description: "Example description for a natural-fibre area rug.", price: "2499", compareAtPrice: "2999", stock: "40", lowStockThreshold: "5", status: "ACTIVE", categorySlug: "rugs", themeSlug: "coastal", material: "Jute", color: "Natural Beige", width: "150 cm", height: "0.8 cm", careInstructions: "Spot clean only. Avoid direct sunlight.", newArrival: "YES", bestSeller: "NO", trending: "NO", featured: "NO" },
      { productId: "", sku: "DEMO-0002", name: "Demo Brass Wall Sconce (fictional — do not import as-is)", slug: "demo-brass-wall-sconce", description: "Example description for a lighting fixture.", price: "1899", compareAtPrice: "", stock: "15", lowStockThreshold: "3", status: "DRAFT", categorySlug: "lighting", themeSlug: "", material: "Brass", color: "Antique Gold", width: "12 cm", height: "20 cm", careInstructions: "Wipe with a dry cloth.", newArrival: "NO", bestSeller: "NO", trending: "YES", featured: "YES" },
    ]);
    void sheet;
    addInstructionsSheet(wb, [
      { heading: "How matching works", body: "SKU is the only matching key. A row whose SKU already exists updates that product; a row with a new SKU creates a product. Re-uploading the same file twice never creates duplicates." },
      { heading: "Required columns for NEW products", body: "SKU, Product Name, Description, Price, and Category are required when creating a product (SKU not already in the database). All other columns are optional and use sensible defaults (Status defaults to DRAFT, Low Stock Threshold defaults to 5, Stock defaults to 0)." },
      { heading: "Required columns for UPDATING an existing product", body: "None are required — only the columns you fill in are changed. See \"How blank cells behave\" below." },
      { heading: "SKU rules", body: "Must be unique. Case-sensitive, matched exactly. Cannot be blank." },
      { heading: "Price rules", body: "Price and Compare At Price must be non-negative numbers. Compare At Price, if set, must be less than Price." },
      { heading: "Category / Theme", body: "Enter the category or theme SLUG (not the display name), e.g. \"rugs\", \"lighting\", \"coastal\". An unrecognized slug fails that row with an error. Theme is optional — leave blank for no theme." },
      { heading: "YES/NO fields", body: "New Arrival, Best Seller, Trending, and Featured accept YES, NO, TRUE, FALSE, 1, or 0 (case-insensitive). Leave blank to not change that flag on an update, or to default to NO on a new product." },
      { heading: "Attribute fields", body: "Material, Color, Width, Height, and Care Instructions are stored as product attributes, not separate database columns. A blank cell on an existing product means \"leave unchanged\", never \"clear this value.\"" },
      { heading: "How blank cells behave", body: "UPDATE row: a blank cell is left exactly as-is. CREATE row: blank optional cells fall back to defaults; blank required cells (Name, Description, Price, Category) fail that row with an error." },
      { heading: "Image handling", body: "This file does not include product images. Use Product_Image_Import_Template.xlsx (new in this module) for image URLs, or the existing Bulk Images tool in Products for binary file uploads matched by filename (e.g. DEMO-0001-1.jpg)." },
      { heading: "Inventory handling", body: "The Stock column only sets the STARTING quantity for a brand-new product. For an existing product this file never changes stock — use Inventory_Import_Template.xlsx instead, so every change is a tracked, reasoned adjustment." },
      { heading: "Preview before applying", body: "Uploading only previews the changes — nothing is written to the database until you review and confirm." },
      { heading: "Live version", body: "This is a static reference copy. The always-current live version of this exact file is available in the app at Admin > Products > Import, or GET /api/admin/products/import/template." },
    ]);
    await writeWb(wb, "Product_Import_Template.xlsx");
  }

  // 2. Product_Export_Template.xlsx
  {
    const wb = new ExcelJS.Workbook();
    addDataSheet(wb, "Product Export Format", PRODUCT_EXPORT_COLUMNS, [
      {
        productId: "cklxxxxx000example1", sku: "DEMO-0001", name: "Demo Handwoven Jute Rug (fictional)", slug: "demo-handwoven-jute-rug",
        description: "Example description for a natural-fibre area rug.", price: "2499", compareAtPrice: "2999", stock: "40",
        lowStockThreshold: "5", status: "ACTIVE", categorySlug: "rugs", themeSlug: "coastal", material: "Jute", color: "Natural Beige",
        width: "150 cm", height: "0.8 cm", careInstructions: "Spot clean only.", newArrival: "YES", bestSeller: "NO", trending: "NO", featured: "NO",
      },
    ]);
    addInstructionsSheet(wb, [
      { heading: "What this file is", body: "This is a FORMAT SAMPLE, not a live data dump. The real, always-current export is downloaded from Admin > Products > Export, or GET /api/admin/products/export?format=xlsx. This file exists so you always have an offline reference for the exact column layout." },
      { heading: "Round-trip safe", body: "An unmodified real export from the app is always a valid re-import (Product Import Template uses the same columns) — SKU is the matching key, so re-uploading never creates duplicates." },
      { heading: "System fields — never edit", body: "Product ID is shown for reference/audit only. It is never read on import; changing it has no effect." },
    ]);
    await writeWb(wb, "Product_Export_Template.xlsx");
  }

  // 3. Inventory_Import_Template.xlsx
  {
    const wb = new ExcelJS.Workbook();
    const sheet = addDataSheet(
      wb, "Inventory Import Template",
      [{ key: "sku", header: "SKU" }, { key: "quantity", header: "Quantity" }, { key: "reason", header: "Reason" }, { key: "notes", header: "Notes" }],
      [
        { sku: "DEMO-0001", quantity: "+10", reason: "purchase", notes: "New supplier shipment" },
        { sku: "DEMO-0002", quantity: "-2", reason: "damage", notes: "Damaged in transit" },
      ]
    );
    addDropdown(sheet, "C", 2, 500, STOCK_ADJUSTMENT_REASONS);
    addInstructionsSheet(wb, [
      { heading: "How this works", body: "This is NOT a direct stock overwrite. Each row is applied as a signed ADJUSTMENT (e.g. +10 or -2) through the exact same stock-adjustment service the single-product Stock panel uses — every change is recorded as a StockMovement row with a reason, and stock can never be pushed below zero." },
      { heading: "SKU", body: "Must match an existing product's SKU exactly. Unknown SKUs fail that row with a clear error — no product is created by this file." },
      { heading: "Quantity", body: "The header must be exactly \"Quantity\" — a whole number, signed. +10 increases stock by 10; -2 decreases by 2. Zero is rejected (nothing to adjust)." },
      { heading: "Reason", body: `Must be one of: ${STOCK_ADJUSTMENT_REASONS.join(", ")} (case-insensitive). Pick one from the dropdown in column C. See the Allowed Values sheet.` },
      { heading: "Multiple rows, same SKU", body: "Rows are applied in file order. If two rows target the same SKU, the second row's negative-stock check sees the first row's already-applied change (so \"row1 +20, row2 -25\" on a SKU starting at stock 3 correctly fails row2)." },
      { heading: "Preview before applying", body: "Uploading only previews the changes — nothing is written until you review and confirm, same as the Product Import flow." },
    ]);
    addAllowedValuesSheet(wb, [{ field: "Reason", values: STOCK_ADJUSTMENT_REASONS.join(", ") }]);
    await writeWb(wb, "Inventory_Import_Template.xlsx");
  }

  // 4. Inventory_Export_Template.xlsx
  {
    const wb = new ExcelJS.Workbook();
    addDataSheet(wb, "Inventory Export Format", INVENTORY_EXPORT_COLUMNS, [
      { sku: "DEMO-0001", name: "Demo Handwoven Jute Rug (fictional)", categorySlug: "rugs", currentStock: "40", lowStockThreshold: "5", stockStatus: "IN_STOCK", status: "ACTIVE" },
      { sku: "DEMO-0002", name: "Demo Brass Wall Sconce (fictional)", categorySlug: "lighting", currentStock: "2", lowStockThreshold: "3", stockStatus: "LOW_STOCK", status: "DRAFT" },
    ]);
    addInstructionsSheet(wb, [
      { heading: "What this file is", body: "Format sample. The real, always-current export is GET /api/admin/inventory/export?format=xlsx (new in this module — Admin > Inventory did not previously have an export button)." },
      { heading: "This file is read-only", body: "Current Stock here is a snapshot, not editable input. To change stock, use Inventory_Import_Template.xlsx (signed adjustments), never this file." },
    ]);
    await writeWb(wb, "Inventory_Export_Template.xlsx");
  }

  // 5. Category_Import_Template.xlsx (SEO-only — see category-seo-import.ts)
  {
    const wb = new ExcelJS.Workbook();
    addDataSheet(
      wb, "Category SEO Import",
      [{ key: "slug", header: "Slug" }, { key: "seoTitle", header: "SEO Title" }, { key: "seoDesc", header: "SEO Description" }],
      [
        { slug: "rugs", seoTitle: "Handwoven Rugs Online | Elysia", seoDesc: "Shop natural-fibre and handwoven rugs, crafted for modern homes." },
        { slug: "lighting", seoTitle: "-", seoDesc: "Example: a lone \"-\" clears an existing value; leave the cell blank to leave it unchanged." },
      ]
    );
    addInstructionsSheet(wb, [
      { heading: "Why this file only has 3 columns", body: "Category Name, Slug, Description, Image, Parent, Sort Order, and Visibility have NO admin write API anywhere in this application today — they are seed-managed (see Admin > Categories, which is explicitly SEO-only). Building full category CRUD is a separate, larger feature (a new authorized API surface, and likely a category slug-redirect system mirroring the product one) that is out of this module's scope: an Excel layer can only expose what the application already lets an admin change. SEO Title and SEO Description are the only two category fields with an existing, authorized write path (the same one the Admin > Categories > [category] > SEO screen uses), so that is all this file imports." },
      { heading: "Matching key", body: "Slug — the same stable identifier shown in the storefront URL and in Category_Export_Template.xlsx." },
      { heading: "Blank vs. clear", body: "Leave a cell blank to leave that field exactly as it is. To deliberately CLEAR an existing SEO Title or Description, put a single hyphen \"-\" in the cell (see the example row above) — a blank cell is never treated as \"clear this value\"." },
      { heading: "For everything else", body: "Use Category_Export_Template.xlsx to see current values for reference. To change name/slug/visibility/sort order/parent/image, this must be done directly in the database (e.g. via prisma studio or a seed update) until a dedicated admin screen exists for those fields — this is an accurate limitation, not an oversight." },
    ]);
    await writeWb(wb, "Category_Import_Template.xlsx");
  }

  // 6. Category_Export_Template.xlsx
  {
    const wb = new ExcelJS.Workbook();
    addDataSheet(wb, "Category Export Format", CATEGORY_EXPORT_COLUMNS, [
      { categoryId: "cklxxxxx000example1", name: "Rugs", slug: "rugs", description: "Handwoven and natural-fibre rugs.", image: "https://example.com/rugs.jpg", parentSlug: "", sortOrder: "1", isVisible: "YES", seoTitle: "", seoDesc: "" },
    ]);
    addInstructionsSheet(wb, [
      { heading: "What this file is", body: "Format sample. The real, always-current export is GET /api/admin/categories/export?format=xlsx (new in this module)." },
      { heading: "Which columns round-trip on import", body: "Only Slug + SEO Title + SEO Description can be re-imported, via Category_Import_Template.xlsx. Every other column here (Name, Description, Image, Parent, Sort Order, Visible) is read-only reference — see that file's Instructions sheet for why." },
    ]);
    await writeWb(wb, "Category_Export_Template.xlsx");
  }

  // 7. Theme_Import_Template.xlsx (no writable fields exist at all)
  {
    const wb = new ExcelJS.Workbook();
    addDataSheet(wb, "Themes (REFERENCE ONLY)", THEME_EXPORT_COLUMNS, [
      { themeId: "cklxxxxx000example1", name: "Coastal", slug: "coastal", description: "Breezy, light, natural-fibre pieces.", banner: "https://example.com/coastal.jpg", sortOrder: "1", isEnabled: "YES" },
    ]);
    addInstructionsSheet(wb, [
      { heading: "Theme import is NOT supported", body: "Unlike Category, Theme has no admin-writable fields at all in this application today — no admin page, no admin API, and the database model itself has no SEO columns (Category.seoTitle/seoDesc have no Theme equivalent). Every Theme row is 100% seed-managed. Building any theme write path (even SEO-only) would require adding new schema columns and a brand-new authorized API — a genuine new feature, out of this module's \"Excel over existing architecture\" scope. This sheet is reference-only, generated from the same columns as Theme_Export_Template.xlsx, so you always know what exists without needing database access." },
      { heading: "To change a theme", body: "Update it directly via the database/seed until a dedicated admin Theme management screen is built (a candidate for a future module)." },
    ]);
    await writeWb(wb, "Theme_Import_Template.xlsx");
  }

  // 8. Theme_Export_Template.xlsx
  {
    const wb = new ExcelJS.Workbook();
    addDataSheet(wb, "Theme Export Format", THEME_EXPORT_COLUMNS, [
      { themeId: "cklxxxxx000example1", name: "Coastal", slug: "coastal", description: "Breezy, light, natural-fibre pieces.", banner: "https://example.com/coastal.jpg", sortOrder: "1", isEnabled: "YES" },
    ]);
    addInstructionsSheet(wb, [
      { heading: "What this file is", body: "Format sample. The real, always-current export is GET /api/admin/themes/export?format=xlsx (new in this module)." },
      { heading: "Read-only", body: "There is no theme import — see Theme_Import_Template.xlsx's Instructions sheet for exactly why." },
    ]);
    await writeWb(wb, "Theme_Export_Template.xlsx");
  }

  // 9. Product_Image_Import_Template.xlsx
  {
    const wb = new ExcelJS.Workbook();
    const sheet = addDataSheet(
      wb, "Product Image Import",
      [
        { key: "sku", header: "SKU" }, { key: "imageUrl", header: "Image URL" }, { key: "altText", header: "Alt Text" },
        { key: "sortOrder", header: "Sort Order" }, { key: "purpose", header: "Purpose" },
      ],
      [
        { sku: "DEMO-0001", imageUrl: "https://example.com/demo-0001-a.jpg", altText: "Jute rug, top view", sortOrder: "0", purpose: "PRODUCT" },
        { sku: "DEMO-0001", imageUrl: "https://example.com/demo-0001-b.jpg", altText: "Jute rug, styled in a living room", sortOrder: "1", purpose: "LIFESTYLE" },
      ]
    );
    addDropdown(sheet, "E", 2, 2000, ["PRODUCT", "LIFESTYLE", "DETAIL"]);
    addInstructionsSheet(wb, [
      { heading: "Images are by URL, not file upload", body: "This file references images already hosted somewhere reachable by URL — it does not carry binary image data. This application's images are stored via its configured storage provider (see docs/import-export/README.md for how to check which one) and referenced by URL from then on; Cloudinary is not currently integrated. To upload new binary image FILES in bulk, use the existing Admin > Products > Bulk Images tool instead (filename convention SKU-position.jpg, e.g. DEMO-0001-1.jpg) — unrelated to this file, and unchanged by this module." },
      { heading: "How matching works", body: "Each row is matched by (SKU, Image URL) together. A URL your product doesn't have yet CREATES a new image for it. A URL it already has UPDATES only that image's Alt Text / Sort Order / Purpose — the URL itself is not changed by an update." },
      { heading: "Primary image", body: "There is no separate \"is primary\" flag in this app — Sort Order 0 is the existing convention for \"the main image\" used across the storefront. Give the image you want shown first Sort Order 0." },
      { heading: "Purpose", body: "PRODUCT, LIFESTYLE, or DETAIL — pick from the dropdown in column E. Leave blank on a new row to default to PRODUCT; leave blank on an existing row to leave it unchanged." },
      { heading: "Visibility", body: "There is no per-image enabled/disabled toggle in this application — every image on a product is always shown. To remove an image, delete it from the product's Images panel in the admin UI (not supported via this file, to avoid an Excel row silently deleting content)." },
    ]);
    addAllowedValuesSheet(wb, [{ field: "Purpose", values: "PRODUCT, LIFESTYLE, DETAIL" }]);
    await writeWb(wb, "Product_Image_Import_Template.xlsx");
  }

  // 10. Product_Image_Export_Template.xlsx
  {
    const wb = new ExcelJS.Workbook();
    addDataSheet(wb, "Product Image Export Format", PRODUCT_IMAGE_EXPORT_COLUMNS, [
      { sku: "DEMO-0001", productName: "Demo Handwoven Jute Rug (fictional)", imageUrl: "https://example.com/demo-0001-a.jpg", altText: "Jute rug, top view", sortOrder: "0", isPrimary: "YES", purpose: "PRODUCT" },
    ]);
    addInstructionsSheet(wb, [
      { heading: "What this file is", body: "Format sample. The real, always-current export is GET /api/admin/products/images/export?format=xlsx (new in this module)." },
      { heading: "Round-trip", body: "An unmodified real export re-imports cleanly through Product_Image_Import_Template.xlsx — every existing (SKU, Image URL) pair is classified UNCHANGED unless a value was actually edited." },
    ]);
    await writeWb(wb, "Product_Image_Export_Template.xlsx");
  }

  // 11. Master_Catalog_Template.xlsx
  {
    const wb = new ExcelJS.Workbook();
    addDataSheet(wb, "Products", PRODUCT_EXPORT_COLUMNS, [
      { productId: "", sku: "DEMO-0001", name: "Demo Handwoven Jute Rug (fictional)", slug: "demo-handwoven-jute-rug", description: "Example rug description.", price: "2499", compareAtPrice: "2999", stock: "40", lowStockThreshold: "5", status: "ACTIVE", categorySlug: "rugs", themeSlug: "coastal", material: "Jute", color: "Natural Beige", width: "150 cm", height: "0.8 cm", careInstructions: "Spot clean only.", newArrival: "YES", bestSeller: "NO", trending: "NO", featured: "NO" },
    ]);
    addDataSheet(
      wb, "Variants (reference only)",
      [{ key: "productSku", header: "Product SKU" }, { key: "variantSku", header: "Variant SKU" }, { key: "variantName", header: "Variant Name" }, { key: "price", header: "Price" }, { key: "stock", header: "Stock" }],
      [{ productSku: "DEMO-0001", variantSku: "DEMO-0001-L", variantName: "Large", price: "2999", stock: "10" }]
    );
    addDataSheet(wb, "Categories", CATEGORY_EXPORT_COLUMNS, [
      { categoryId: "", name: "Rugs", slug: "rugs", description: "Handwoven and natural-fibre rugs.", image: "", parentSlug: "", sortOrder: "1", isVisible: "YES", seoTitle: "", seoDesc: "" },
    ]);
    addDataSheet(wb, "Themes (reference only)", THEME_EXPORT_COLUMNS, [
      { themeId: "", name: "Coastal", slug: "coastal", description: "Breezy, natural-fibre pieces.", banner: "", sortOrder: "1", isEnabled: "YES" },
    ]);
    addDataSheet(wb, "Product Images", PRODUCT_IMAGE_EXPORT_COLUMNS, [
      { sku: "DEMO-0001", productName: "Demo Handwoven Jute Rug (fictional)", imageUrl: "https://example.com/demo-0001-a.jpg", altText: "Top view", sortOrder: "0", isPrimary: "YES", purpose: "PRODUCT" },
    ]);
    addDataSheet(
      wb, "Inventory", INVENTORY_EXPORT_COLUMNS,
      [{ sku: "DEMO-0001", name: "Demo Handwoven Jute Rug (fictional)", categorySlug: "rugs", currentStock: "40", lowStockThreshold: "5", stockStatus: "IN_STOCK", status: "ACTIVE" }]
    );
    addDataSheet(
      wb, "SEO",
      [{ key: "entityType", header: "Entity Type" }, { key: "key", header: "SKU / Slug" }, { key: "seoTitle", header: "SEO Title" }, { key: "seoDesc", header: "SEO Description" }],
      [
        { entityType: "Product", key: "DEMO-0001", seoTitle: "Handwoven Jute Rug | Elysia", seoDesc: "Natural-fibre area rug, handwoven." },
        { entityType: "Category", key: "rugs", seoTitle: "Handwoven Rugs Online | Elysia", seoDesc: "Shop handwoven rugs." },
      ]
    );

    addInstructionsSheet(wb, [
      { heading: "What this workbook is", body: "The single most useful daily-operations reference: one file with every catalog entity's current format side by side. It is a format/reference sample (fictional example rows), not a live snapshot — download live data per-entity from the app's own Export buttons/API routes listed in each sheet's counterpart single-entity template." },
      { heading: "Products sheet", body: "Full create/update format — import via Product_Import_Template.xlsx / Admin > Products > Import. Unique key: SKU." },
      { heading: "Variants sheet — reference only", body: "ProductVariant exists in the schema and has a working single-variant admin API (create/update/delete under each product's edit page), but it is not yet wired into cart or checkout — a variant cannot actually be purchased today. It is intentionally NOT included in the bulk product import/export file, matching the existing app's own scope boundary; this sheet is read-only reference." },
      { heading: "Categories sheet", body: "Only SEO Title/SEO Description round-trip on import (Category_Import_Template.xlsx). Unique key: Slug." },
      { heading: "Themes sheet — reference only", body: "No import capability exists for Theme at all (see Theme_Import_Template.xlsx). Unique key: Slug." },
      { heading: "Product Images sheet", body: "Import via Product_Image_Import_Template.xlsx / POST /api/admin/products/images/import/parse+apply. Unique key: SKU + Image URL." },
      { heading: "Inventory sheet", body: "Import via Inventory_Import_Template.xlsx as signed adjustments, never a direct overwrite. Unique key: SKU." },
      { heading: "SEO sheet", body: "A convenience READ-ONLY merged view across Product and Category SEO fields for quick review. To change a value, edit it in the Products sheet (product SEO) or Category_Import_Template.xlsx (category SEO) — this merged sheet itself is not a supported import source, to avoid two different files disagreeing about which one is authoritative." },
      { heading: "Do I need to touch Prisma?", body: "No. Every import in this workbook goes through the application's existing, authorized API routes, which update the database (via Prisma) automatically. You should never hand-edit the database directly for a routine catalog operation described here." },
    ]);
    addAllowedValuesSheet(wb, [
      { field: "Product Status", values: "ACTIVE, DRAFT, ARCHIVED" },
      { field: "Image Purpose", values: "PRODUCT, LIFESTYLE, DETAIL" },
      { field: "Inventory Reason", values: STOCK_ADJUSTMENT_REASONS.join(", ") },
      { field: "YES/NO fields", values: "YES, NO, TRUE, FALSE, 1, 0 (case-insensitive)" },
    ]);

    const rules = wb.addWorksheet("Validation Rules");
    rules.columns = [{ header: "Rule", key: "rule", width: 110 }];
    rules.getRow(1).font = { bold: true };
    [
      "SKU is required and must be unique for every product row.",
      "Price and Compare-At Price must be non-negative numbers; Compare-At Price must be less than Price.",
      "Category (by slug) is required for a new product and must reference an existing category.",
      "Theme (by slug), if given, must reference an existing theme.",
      "Inventory adjustments can never take stock below zero — that row is rejected.",
      "Inventory Reason must be one of the Allowed Values sheet's Inventory Reason list.",
      "Category import only accepts SEO Title / SEO Description changes — any other column is ignored.",
      "Theme has no supported import at all.",
      "A blank cell on an UPDATE row always means \"leave unchanged\", never \"clear this value\".",
    ].forEach((rule) => rules.addRow({ rule }));

    await writeWb(wb, "Master_Catalog_Template.xlsx");
  }

  console.log("\nAll 11 templates generated successfully.");
}

main().catch((err) => {
  console.error("Template generation failed:", err);
  process.exitCode = 1;
});
