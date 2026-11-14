import "server-only";
import ExcelJS from "exceljs";
import { EXPORT_COLUMNS } from "@/lib/admin/product-export";

/** Two clearly-fictional example rows — headers only, never written to the
 *  database by this endpoint (it's a pure file-generation route, no Prisma
 *  writes at all). Demonstrates one CREATE (new SKU) and one field set an
 *  admin would typically fill for an UPDATE. */
const EXAMPLE_ROWS: Record<(typeof EXPORT_COLUMNS)[number]["key"], string>[] = [
  {
    productId: "",
    sku: "DEMO-0001",
    name: "Demo Handwoven Jute Rug (fictional — do not import as-is)",
    slug: "demo-handwoven-jute-rug",
    description: "Example description for a natural-fibre area rug.",
    price: "2499",
    compareAtPrice: "2999",
    stock: "40",
    lowStockThreshold: "5",
    status: "ACTIVE",
    categorySlug: "rugs",
    themeSlug: "coastal",
    material: "Jute",
    color: "Natural Beige",
    width: "150 cm",
    height: "0.8 cm",
    careInstructions: "Spot clean only. Avoid direct sunlight.",
    newArrival: "YES",
    bestSeller: "NO",
    trending: "NO",
    featured: "NO",
  },
  {
    productId: "",
    sku: "DEMO-0002",
    name: "Demo Brass Wall Sconce (fictional — do not import as-is)",
    slug: "demo-brass-wall-sconce",
    description: "Example description for a lighting fixture.",
    price: "1899",
    compareAtPrice: "",
    stock: "15",
    lowStockThreshold: "3",
    status: "DRAFT",
    categorySlug: "lighting",
    themeSlug: "",
    material: "Brass",
    color: "Antique Gold",
    width: "12 cm",
    height: "20 cm",
    careInstructions: "Wipe with a dry cloth.",
    newArrival: "NO",
    bestSeller: "NO",
    trending: "YES",
    featured: "YES",
  },
];

const INSTRUCTIONS: { heading: string; body: string }[] = [
  {
    heading: "How matching works",
    body:
      "SKU is the only matching key. A row whose SKU already exists updates that product; a row with a new SKU creates a " +
      "product. Re-uploading the same file twice never creates duplicates.",
  },
  {
    heading: "Required columns for NEW products",
    body:
      "SKU, Product Name, Description, Price, and Category are required when creating a product (SKU not already in the " +
      "database). All other columns are optional and use sensible defaults (Status defaults to DRAFT, Low Stock Threshold " +
      "defaults to 5, Stock defaults to 0).",
  },
  {
    heading: "Required columns for UPDATING an existing product",
    body: "None are required — only the columns you fill in are changed. See \"How blank cells behave\" below.",
  },
  {
    heading: "SKU rules",
    body: "Must be unique. Case-sensitive, matched exactly. Cannot be blank.",
  },
  {
    heading: "Price rules",
    body:
      "Price and Compare At Price must be non-negative numbers. Compare At Price, if set, must be less than Price " +
      "(this is validated the same way the admin product form validates it).",
  },
  {
    heading: "Category / Theme",
    body:
      "Enter the category or theme SLUG (not the display name) — the same slug shown in each one's admin settings page or " +
      "storefront URL, e.g. \"rugs\", \"lighting\", \"coastal\". An unrecognized slug fails that row with an error; it does " +
      "not create a new category or theme. Theme is optional — leave blank for no theme.",
  },
  {
    heading: "YES/NO fields",
    body:
      "New Arrival, Best Seller, Trending, and Featured accept YES, NO, TRUE, FALSE, 1, or 0 (case-insensitive). Leave blank " +
      "to not change that flag on an update, or to default to NO on a new product.",
  },
  {
    heading: "Attribute fields",
    body:
      "Material, Color, Width, Height, and Care Instructions are stored as product attributes, not separate database " +
      "columns — the same rows editable in the admin product page's Attributes panel. A blank cell in one of these columns " +
      "means \"leave unchanged\" for an existing product, not \"clear this value.\"",
  },
  {
    heading: "How blank cells behave",
    body:
      "For an UPDATE row (existing SKU): a blank cell means that field is left exactly as it currently is — it is never " +
      "cleared or reset by an import. For a CREATE row (new SKU): blank optional cells fall back to defaults; blank " +
      "required cells (Name, Description, Price, Category) cause that row to fail with an error and no product is created.",
  },
  {
    heading: "Image handling",
    body:
      "This file does not include product images. Use the separate \"Bulk Images\" tool in Products, which matches image " +
      "files to products by filename — e.g. DEMO-0001-1.jpg, DEMO-0001-2.jpg — using the SKU as the prefix and the trailing " +
      "number as image order.",
  },
  {
    heading: "Inventory handling",
    body:
      "The Stock column only sets the STARTING quantity for a brand-new product (a new SKU). For an existing product, this " +
      "file never changes stock, even if you edit the Stock column — stock only ever changes through a tracked stock " +
      "movement (the per-product Stock panel, or Inventory > Bulk Adjustment Import), so every change has a reason and " +
      "shows up in inventory history.",
  },
  {
    heading: "Preview before applying",
    body:
      "Uploading this file only previews the changes (rows classified as Create / Update / Unchanged / Error) — nothing is " +
      "written to the database until you review the preview and click Confirm Import.",
  },
  {
    heading: "Example rows",
    body:
      "The two rows on the Product Import Template sheet are fictional demo data for illustration only. Delete them (or " +
      "replace the SKUs) before importing — do not import them into a live catalog as-is.",
  },
];

export async function generateProductImportTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const sheet = wb.addWorksheet("Product Import Template");
  sheet.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  EXAMPLE_ROWS.forEach((r) => sheet.addRow(r));

  const instructions = wb.addWorksheet("Instructions");
  instructions.columns = [
    { header: "Topic", key: "heading", width: 32 },
    { header: "Details", key: "body", width: 100 },
  ];
  instructions.getRow(1).font = { bold: true };
  INSTRUCTIONS.forEach((row) => {
    const added = instructions.addRow(row);
    added.alignment = { wrapText: true, vertical: "top" };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
