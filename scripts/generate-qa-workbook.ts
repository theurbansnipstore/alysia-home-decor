/**
 * Module 41 Part A — generates docs/qa/Store_QA_Test_Cases.xlsx, a manual
 * QA workbook for local testing of the whole application. Content here is
 * grounded in the actual application architecture audited across Modules
 * 34-40 of this project (checkout/billing/COD/refund/CMS/SEO/security/
 * import-export) — not generic boilerplate test-case text.
 *
 * Run with: npx tsx scripts/generate-qa-workbook.ts
 */
import ExcelJS from "exceljs";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const OUT_DIR = path.join(__dirname, "..", "docs", "qa");
mkdirSync(OUT_DIR, { recursive: true });

function styleHeader(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

function addSheet(wb: ExcelJS.Workbook, name: string, columns: { key: string; header: string; width?: number }[], rows: Record<string, string>[]) {
  const sheet = wb.addWorksheet(name);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));
  rows.forEach((r) => {
    const added = sheet.addRow(r);
    added.alignment = { wrapText: true, vertical: "top" };
  });
  styleHeader(sheet);
  return sheet;
}

// ---------------------------------------------------------------------------
// 1. Test Case Index
// ---------------------------------------------------------------------------
type IndexRow = {
  id: string; area: string; feature: string; priority: "P1" | "P2" | "P3";
  type: string; credential: "NO" | "YES"; local: "YES" | "PARTIAL" | "NO";
  preconditions: string;
};

const INDEX: IndexRow[] = [
  { id: "AUTH-001", area: "Auth", feature: "Customer registration", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "AUTH-002", area: "Auth", feature: "Customer login", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Registered account exists" },
  { id: "AUTH-003", area: "Auth", feature: "Logout", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Logged in" },
  { id: "AUTH-004", area: "Auth", feature: "Invalid password rejected", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Registered account exists" },
  { id: "AUTH-005", area: "Auth", feature: "Password reset flow (token generation)", priority: "P2", type: "Functional", credential: "NO", local: "PARTIAL", preconditions: "Registered account exists" },
  { id: "AUTH-006", area: "Auth", feature: "Session persists across page reload", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Logged in" },
  { id: "AUTH-007", area: "Auth", feature: "Open-redirect ?redirect= is rejected for off-site URLs", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "None" },
  { id: "HOME-001", area: "Homepage", feature: "Hero/banner renders", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "HOME-002", area: "Homepage", feature: "Theme showcase rail renders enabled themes only", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "At least one enabled theme exists" },
  { id: "HOME-003", area: "Homepage", feature: "Announcement bar reflects Settings", priority: "P3", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access to Content > Announcement" },
  { id: "SHOP-001", area: "Shop", feature: "Product grid loads and paginates", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Products exist" },
  { id: "SHOP-002", area: "Shop", feature: "Category filter narrows results", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Multiple categories with products" },
  { id: "SHOP-003", area: "Shop", feature: "Theme filter narrows results", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Multiple themes with products" },
  { id: "SHOP-004", area: "Shop", feature: "Price filter narrows results", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Products across price range" },
  { id: "SHOP-005", area: "Shop", feature: "Sort (price/newest) changes order", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Multiple products" },
  { id: "SHOP-006", area: "Shop", feature: "Show filter sidebar OFF hides sidebar on /shop", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access to Settings > Shop" },
  { id: "SHOP-007", area: "Shop", feature: "Product card wishlist/cart/rating toggles", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access to Settings > Shop" },
  { id: "SHOP-008", area: "Shop", feature: "Search returns relevant products", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Products with distinct names exist" },
  { id: "PRODUCT-001", area: "Product", feature: "Product detail page loads all fields", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "An ACTIVE product exists" },
  { id: "PRODUCT-002", area: "Product", feature: "Image gallery navigation", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Product with 2+ images" },
  { id: "PRODUCT-003", area: "Product", feature: "Out-of-stock product shows disabled Add to Cart", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Product with stockAvailable=0" },
  { id: "PRODUCT-004", area: "Product", feature: "Invalid/unknown product slug returns 404", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "PRODUCT-005", area: "Product", feature: "Retired slug 308-redirects to current slug", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "A product whose slug was changed via import/admin edit" },
  { id: "CART-001", area: "Cart", feature: "Add to cart from product page", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "ACTIVE, in-stock product" },
  { id: "CART-002", area: "Cart", feature: "Update quantity in cart", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Item already in cart" },
  { id: "CART-003", area: "Cart", feature: "Remove item from cart", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Item already in cart" },
  { id: "CART-004", area: "Cart", feature: "Quantity cannot exceed available stock", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Product with limited stock" },
  { id: "CART-005", area: "Cart", feature: "Empty cart shows empty state, blocks checkout", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Cart is empty" },
  { id: "CART-006", area: "Cart", feature: "Free-shipping threshold banner/progress", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin-configured free-shipping threshold" },
  { id: "CHECKOUT-001", area: "Checkout", feature: "Address form validation (required fields)", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Cart has items, logged in" },
  { id: "CHECKOUT-002", area: "Checkout", feature: "Area/Locality field placeholder is neutral (not 'Andheri West')", priority: "P3", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "CHECKOUT-003", area: "Checkout", feature: "Billing setting OFF: no separate billing option shown", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin sets Allow Different Billing Address = OFF" },
  { id: "CHECKOUT-004", area: "Checkout", feature: "Billing setting ON, unchecked: billing = shipping", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin sets Allow Different Billing Address = ON" },
  { id: "CHECKOUT-005", area: "Checkout", feature: "Billing setting ON, checked: separate billing form required and stored", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin sets Allow Different Billing Address = ON" },
  { id: "CHECKOUT-006", area: "Checkout", feature: "Shipping charge recalculates on address change", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Zone-based shipping configured" },
  { id: "CHECKOUT-007", area: "Checkout", feature: "Coupon code applies discount", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "An active Coupon exists" },
  { id: "CHECKOUT-008", area: "Checkout", feature: "Invalid coupon code rejected with 400", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "PAYMENT-001", area: "Payment", feature: "COD order places successfully", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Cart has items, COD enabled, customer not COD-blocked" },
  { id: "PAYMENT-002", area: "Payment", feature: "COD-blocked customer cannot select COD", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Customer flagged codBlocked=true" },
  { id: "PAYMENT-003", area: "Payment", feature: "Razorpay order creation reaches Razorpay's hosted checkout", priority: "P1", type: "Provider-contract", credential: "YES", local: "PARTIAL", preconditions: "Razorpay test/live keys configured" },
  { id: "PAYMENT-004", area: "Payment", feature: "Razorpay webhook signature verification (locally signed payload)", priority: "P1", type: "Provider-contract", credential: "NO", local: "YES", preconditions: "scripts/simulate-webhook.ts available" },
  { id: "PAYMENT-005", area: "Payment", feature: "Client cannot manipulate order total/discount sent to server", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "Cart has items" },
  { id: "ORDER-001", area: "Order", feature: "Order confirmation page shows correct summary", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "An order was just placed" },
  { id: "ORDER-002", area: "Order", feature: "Order appears in customer's Order History", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Logged-in customer with at least one order" },
  { id: "ORDER-003", area: "Order", feature: "Customer B cannot view Customer A's order (IDOR)", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "Two customer accounts, one order each" },
  { id: "ORDER-004", area: "Order", feature: "Admin transitions order through full status lifecycle", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, an order in PENDING" },
  { id: "ORDER-005", area: "Order", feature: "Cancellation restocks inventory correctly", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, a CONFIRMED order" },
  { id: "ORDER-006", area: "Order", feature: "Return restocking + reason enum enforced", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, a DELIVERED order" },
  { id: "REFUND-001", area: "Refund", feature: "Refund eligibility computed correctly for a cancelled paid order", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "A paid order transitioned to CANCELLED" },
  { id: "REFUND-002", area: "Refund", feature: "Initiate Refund button visible only when eligible", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, orders in various states" },
  { id: "REFUND-003", area: "Refund", feature: "Refund API rejects unauthorized role", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "A non-admin session" },
  { id: "REFUND-004", area: "Refund", feature: "Duplicate refund attempt blocked", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "An order already refunded (simulated)" },
  { id: "REFUND-005", area: "Refund", feature: "Real Razorpay refund actually transfers money", priority: "P1", type: "Provider-contract", credential: "YES", local: "NO", preconditions: "Razorpay live credentials + real paid transaction" },
  { id: "INVENTORY-001", area: "Inventory", feature: "Manual stock adjustment records StockMovement", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, any product" },
  { id: "INVENTORY-002", area: "Inventory", feature: "Adjustment cannot take stock below zero", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, low-stock product" },
  { id: "INVENTORY-003", area: "Inventory", feature: "Low-stock / out-of-stock notification fires once on crossing", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, product near threshold" },
  { id: "IMPORT-001", area: "Import/Export", feature: "Product import CREATE row", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, a new unique SKU" },
  { id: "IMPORT-002", area: "Import/Export", feature: "Product import UPDATE row (blank cells preserved)", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, an existing SKU" },
  { id: "IMPORT-003", area: "Import/Export", feature: "Product import rejects unknown category/theme slug", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access" },
  { id: "IMPORT-004", area: "Import/Export", feature: "Inventory import applies signed adjustment via adjustStock()", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, existing SKU" },
  { id: "IMPORT-005", area: "Import/Export", feature: "Inventory import rejects adjustment that would go negative", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, low-stock SKU" },
  { id: "IMPORT-006", area: "Import/Export", feature: "Category SEO import updates only seoTitle/seoDesc", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, existing category slug" },
  { id: "IMPORT-007", area: "Import/Export", feature: "Product image import CREATEs new image by URL", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, product without that image URL" },
  { id: "IMPORT-008", area: "Import/Export", feature: "Product image import UPDATEs alt text/sort order for existing URL", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, product with an existing image" },
  { id: "IMPORT-009", area: "Import/Export", feature: "Unauthenticated/CUSTOMER import attempts rejected", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "None / customer session" },
  { id: "EXPORT-001", area: "Import/Export", feature: "Product export produces valid, re-importable .xlsx", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, products exist" },
  { id: "EXPORT-002", area: "Import/Export", feature: "Inventory export reflects current stock", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access" },
  { id: "EXPORT-003", area: "Import/Export", feature: "Category/Theme export reflects current DB rows", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access" },
  { id: "EXPORT-004", area: "Import/Export", feature: "Exported cell values starting with = + - @ are not interpreted as formulas", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "A product/category with a name starting with one of those characters" },
  { id: "ADMIN-001", area: "Admin", feature: "Admin login / dashboard loads", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin account exists" },
  { id: "ADMIN-002", area: "Admin", feature: "Role matrix: SUPPORT_STAFF blocked from write actions", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "A SUPPORT_STAFF account" },
  { id: "ADMIN-003", area: "Admin", feature: "Activity log records admin actions", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access" },
  { id: "SEO-001", area: "SEO", feature: "Product/category/theme canonical URL correct", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "SEO-002", area: "SEO", feature: "sitemap.xml includes all ACTIVE products", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "SEO-003", area: "SEO", feature: "robots.txt disallows admin/account/checkout", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "SEO-004", area: "SEO", feature: "Retired product slug returns 308, not 404", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "A product with a slug-change history" },
  { id: "SEO-005", area: "SEO", feature: "JSON-LD product schema present and valid", priority: "P3", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "CMS-001", area: "CMS", feature: "Homepage content editable and reflected live", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access" },
  { id: "CMS-002", area: "CMS", feature: "Custom page (Page model) renders at /[slug]", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "A PUBLISHED Page exists" },
  { id: "CMS-003", area: "CMS", feature: "CMS text fields render as plain text, not executable HTML (XSS)", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "Admin access to a CMS text field" },
  { id: "SHIPPING-001", area: "Shipping", feature: "Zone-based shipping charge calculation", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Shipping zones configured" },
  { id: "SHIPPING-002", area: "Shipping", feature: "Free shipping applied above threshold", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Free-shipping threshold configured" },
  { id: "SHIPPING-003", area: "Shipping", feature: "Real Shiprocket shipment creation", priority: "P2", type: "Provider-contract", credential: "YES", local: "NO", preconditions: "Shiprocket live credentials" },
  { id: "NOTIFY-001", area: "Notifications", feature: "Order-placed notification event created", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "An order is placed" },
  { id: "NOTIFY-002", area: "Notifications", feature: "Email/WhatsApp template renders correctly (local generation)", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "None" },
  { id: "NOTIFY-003", area: "Notifications", feature: "Real email/WhatsApp delivery", priority: "P2", type: "Provider-contract", credential: "YES", local: "NO", preconditions: "Email/WhatsApp provider credentials" },
  { id: "SECURITY-001", area: "Security", feature: "Unauthenticated request to admin API returns 401", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "None" },
  { id: "SECURITY-002", area: "Security", feature: "CUSTOMER request to admin API returns 403", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "A customer session" },
  { id: "SECURITY-003", area: "Security", feature: "Invalid/malformed IDs return 400/404, not 500", priority: "P2", type: "Security", credential: "NO", local: "YES", preconditions: "None" },
  { id: "SECURITY-004", area: "Security", feature: "XSS payload in address/review fields is escaped", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "None" },
  { id: "SECURITY-005", area: "Security", feature: "Client-supplied price/stock/role fields are ignored server-side", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "None" },
  { id: "SECURITY-006", area: "Security", feature: "No stack trace / DB error text reaches API responses", priority: "P2", type: "Security", credential: "NO", local: "YES", preconditions: "A route that can be forced to error" },
  { id: "PERFORMANCE-001", area: "Performance", feature: "Product detail page issues no duplicate queries", priority: "P3", type: "Performance", credential: "NO", local: "YES", preconditions: "PRISMA_LOG_QUERIES=1 dev server" },
  { id: "PERFORMANCE-002", area: "Performance", feature: "Repeated identical request is not slower/heavier the 2nd time", priority: "P3", type: "Performance", credential: "NO", local: "YES", preconditions: "None" },

  // --- Module 42: Admin Import/Export Hub UI + Branding logo/favicon fix ---
  { id: "IMPORT-010", area: "Import/Export", feature: "Admin Import/Export hub (/admin/import-export) lists all 5 sections", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access" },
  { id: "IMPORT-011", area: "Import/Export", feature: "Download Template works for Inventory/Category SEO/Product Images from the hub", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access" },
  { id: "IMPORT-012", area: "Import/Export", feature: "Import wizard Cancel button discards the preview without writing anything", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access, a file uploaded to any wizard" },
  { id: "BRANDING-001", area: "Branding", feature: "Logo upload via Branding settings + live admin preview", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access to Settings > Branding" },
  { id: "BRANDING-002", area: "Branding", feature: "Desktop header logo displays correctly (no distortion, readable size)", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "A logo configured" },
  { id: "BRANDING-003", area: "Branding", feature: "Mobile header logo displays correctly (no distortion, readable size)", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "A logo configured, viewport ≤390px" },
  { id: "BRANDING-004", area: "Branding", feature: "Favicon upload + correct display in the browser tab", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "A favicon configured" },
  { id: "BRANDING-005", area: "Branding", feature: "Transparent-background logo preserves transparency (no white/black box)", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "A transparent PNG/SVG logo" },
  { id: "BRANDING-006", area: "Branding", feature: "Portrait (tall) logo is not squeezed/distorted in the header", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "A portrait-oriented logo file" },
  { id: "BRANDING-007", area: "Branding", feature: "Landscape (wide) logo is not squeezed/distorted in the header", priority: "P2", type: "Functional", credential: "NO", local: "YES", preconditions: "A landscape-oriented logo file" },

  // --- Module 43: Contact CMS + Billing Address control ---
  { id: "BILLING-001", area: "Billing", feature: "Allow Different Billing Address = OFF: checkout shows only \"Same as shipping address\"", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin sets the setting OFF" },
  { id: "BILLING-002", area: "Billing", feature: "Setting = ON: \"Use a different billing address\" option appears", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin sets the setting ON" },
  { id: "BILLING-003", area: "Billing", feature: "\"Same as shipping address\" always places an order successfully", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Cart has items" },
  { id: "BILLING-004", area: "Billing", feature: "\"Use a different billing address\" captures and stores a distinct address", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Setting ON, cart has items" },
  { id: "BILLING-005", area: "Billing", feature: "Server rejects a manipulated \"different billing\" request when the setting is OFF", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "Setting OFF, ability to send a raw API request" },
  { id: "CONTACT-001", area: "Contact CMS", feature: "Edit Contact eyebrow/title via Admin", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access to Content > Contact Page" },
  { id: "CONTACT-002", area: "Contact CMS", feature: "Edit Contact intro/subtitle text via Admin", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access to Content > Contact Page" },
  { id: "CONTACT-003", area: "Contact CMS", feature: "Edit contact information (email/phone/address/hours) via Admin", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "Admin access to Content > Contact Page" },
  { id: "CONTACT-004", area: "Contact CMS", feature: "Public /contact page reflects saved changes after refresh", priority: "P1", type: "Functional", credential: "NO", local: "YES", preconditions: "A change was just saved in Admin" },
  { id: "CONTACT-005", area: "Contact CMS", feature: "Unauthenticated/CUSTOMER request to the Contact settings API is rejected", priority: "P1", type: "Security", credential: "NO", local: "YES", preconditions: "None / a customer session" },
];

// ---------------------------------------------------------------------------
// 2. Manual Test Cases (detailed step-by-step for the highest-value subset)
// ---------------------------------------------------------------------------
type Step = { step: number; action: string; expected: string };
type ManualCase = { id: string; feature: string; objective: string; preconditions: string; steps: Step[] };

const MANUAL_CASES: ManualCase[] = [
  {
    id: "AUTH-001", feature: "Customer registration", objective: "Verify a new visitor can create an account.",
    preconditions: "Not logged in. Have a fresh email address not already registered.",
    steps: [
      { step: 1, action: "Go to /register.", expected: "Registration form loads with Name, Email, Phone, Password fields." },
      { step: 2, action: "Submit with an email already used weaker than 8 chars password.", expected: "Client-side validation error shown; form not submitted." },
      { step: 3, action: "Fill valid Name/Email/Password and submit.", expected: "Account created, redirected to /account or homepage, logged in." },
      { step: 4, action: "Submit the SAME email again on /register.", expected: "Server rejects with a clear 'email already registered' error, no duplicate user created." },
    ],
  },
  {
    id: "AUTH-007", feature: "Open-redirect protection on login", objective: "Verify ?redirect= cannot send a logged-in user off-site.",
    preconditions: "Logged out.",
    steps: [
      { step: 1, action: "Go to /login?redirect=https://evil-example.com.", expected: "Login form loads normally." },
      { step: 2, action: "Log in with valid credentials.", expected: "Redirected to /account (the safe fallback), NOT to the external URL." },
      { step: 3, action: "Repeat with /login?redirect=/account/orders (a real in-app path).", expected: "After login, redirected to /account/orders exactly." },
    ],
  },
  {
    id: "SHOP-006", feature: "Filter sidebar toggle wiring", objective: "Verify the Show Filter Sidebar setting affects every storefront grid it's meant to.",
    preconditions: "Admin access to Settings > Shop.",
    steps: [
      { step: 1, action: "In Admin > Settings > Shop, turn OFF 'Show filter sidebar'. Save.", expected: "Save succeeds." },
      { step: 2, action: "Visit /shop.", expected: "Filter sidebar is not shown." },
      { step: 3, action: "Visit /categories/[any-slug] and /themes/[any-slug].", expected: "Behavior matches the documented scope for that setting (see Module 41 report Part B filter-wiring finding for which pages the setting is defined to affect)." },
      { step: 4, action: "Turn the setting back ON. Save. Revisit /shop.", expected: "Filter sidebar reappears." },
    ],
  },
  {
    id: "CHECKOUT-002", feature: "Address placeholder is neutral, not city-specific", objective: "Verify no address form anywhere in the app suggests a specific locality (e.g. \"Andheri West\") as an example.",
    preconditions: "Cart has 1+ items for checkout; a logged-in account for the account address form.",
    steps: [
      { step: 1, action: "Go to /checkout and look at the Area / Locality field under Shipping Address.", expected: "Placeholder reads a neutral \"Enter area / locality\" — never a specific place name." },
      { step: 2, action: "With Allow Different Billing Address = ON, choose \"Use a different billing address\" and look at its Area / Locality field.", expected: "Same neutral placeholder — never a specific place name." },
      { step: 3, action: "Go to /account/addresses (or the equivalent saved-address form) and look at the Area / Locality field.", expected: "No city-specific example text is shown here either." },
    ],
  },
  {
    id: "CHECKOUT-003", feature: "Billing address — admin setting OFF", objective: "Verify no separate billing option appears when disabled.",
    preconditions: "Admin sets Allow Different Billing Address = OFF. Cart has 1+ items. Logged in.",
    steps: [
      { step: 1, action: "Go to /checkout.", expected: "Address form shown; NO 'Use a different billing address' checkbox anywhere on the page." },
      { step: 2, action: "Fill shipping address and complete a COD order.", expected: "Order places successfully." },
      { step: 3, action: "As admin, open the created order.", expected: "Billing Address stored on the order equals the Shipping Address exactly." },
    ],
  },
  {
    id: "CHECKOUT-004", feature: "Billing address — admin ON, customer leaves unchecked", objective: "Verify billing defaults to shipping when the optional checkbox is left off.",
    preconditions: "Admin sets Allow Different Billing Address = ON. Cart has 1+ items. Logged in.",
    steps: [
      { step: 1, action: "Go to /checkout.", expected: "A 'Use a different billing address' checkbox is visible, unchecked by default." },
      { step: 2, action: "Do NOT check it. Fill shipping address only and place a COD order.", expected: "Checkout succeeds without requiring any billing-specific fields." },
      { step: 3, action: "As admin, open the created order.", expected: "Billing Address equals Shipping Address." },
    ],
  },
  {
    id: "CHECKOUT-005", feature: "Billing address — admin ON, customer checks it", objective: "Verify a genuinely different billing address is captured and required only once opted in.",
    preconditions: "Admin sets Allow Different Billing Address = ON. Cart has 1+ items. Logged in.",
    steps: [
      { step: 1, action: "Go to /checkout and check 'Use a different billing address'.", expected: "A separate billing address form appears." },
      { step: 2, action: "Leave the billing form blank and try to continue.", expected: "Validation blocks submission — billing fields are required only now that the customer opted in." },
      { step: 3, action: "Fill a billing address that differs from shipping (different city). Place a COD order.", expected: "Order places successfully." },
      { step: 4, action: "As admin, open the created order.", expected: "Billing Address differs from Shipping Address exactly as entered." },
      { step: 5, action: "Refresh the checkout page mid-flow (before placing an order) with the box checked.", expected: "No crash; state behaves sensibly (either preserved or reset to unchecked, not a broken form)." },
    ],
  },
  {
    id: "PAYMENT-001", feature: "COD order placement", objective: "Verify a Cash on Delivery order completes end-to-end locally.",
    preconditions: "Cart has 1+ in-stock items. Logged in. Customer not COD-blocked. COD enabled in settings.",
    steps: [
      { step: 1, action: "Go to /checkout, fill address, choose Cash on Delivery.", expected: "COD option is selectable." },
      { step: 2, action: "Place the order.", expected: "Order is created with status PENDING/CONFIRMED, paymentMethod=COD." },
      { step: 3, action: "Check the product's stock before and after.", expected: "stockAvailable decreased by the ordered quantity; a StockMovement row with reason 'order' was created." },
      { step: 4, action: "View Order Confirmation and Account > Orders.", expected: "Order appears correctly in both places." },
    ],
  },
  {
    id: "PAYMENT-005", feature: "Server ignores client-supplied price/total", objective: "Verify checkout cannot be manipulated by tampering with the request body.",
    preconditions: "Cart has 1 item with a known real price. Browser dev tools or an API client (e.g. curl/Postman) available.",
    steps: [
      { step: 1, action: "Open the network request the checkout page sends to place the order.", expected: "Request body is visible." },
      { step: 2, action: "Resend the same request with the item price, subtotal, and total all set to 1.", expected: "Order is created using the REAL server-computed price/total, not the tampered values — or the request is rejected. Never accepts the tampered amount." },
    ],
  },
  {
    id: "ORDER-003", feature: "Order IDOR protection", objective: "Verify one customer cannot view another customer's order.",
    preconditions: "Two customer accounts (A, B). Customer A has placed at least one order.",
    steps: [
      { step: 1, action: "Log in as Customer A, place or locate an order, note its order ID/URL.", expected: "Order detail page loads normally for A." },
      { step: 2, action: "Log out, log in as Customer B. Navigate directly to A's order URL.", expected: "404 (not 403) — existence is never leaked either." },
    ],
  },
  {
    id: "ORDER-005", feature: "Cancellation restocks inventory", objective: "Verify cancelling a confirmed order returns stock correctly.",
    preconditions: "Admin access. An order in CONFIRMED status with a known product/quantity.",
    steps: [
      { step: 1, action: "Note the product's stockAvailable before cancellation.", expected: "Value recorded." },
      { step: 2, action: "As admin, cancel the order with reason CUSTOMER_REQUESTED_CANCELLATION.", expected: "Order status becomes CANCELLED." },
      { step: 3, action: "Recheck the product's stockAvailable.", expected: "Increased by exactly the cancelled quantity; a new StockMovement row with reason 'cancelled' exists." },
    ],
  },
  {
    id: "REFUND-002", feature: "Initiate Refund button visibility", objective: "Verify the refund action only appears when an order is actually eligible.",
    preconditions: "Admin access. At least one PAID+CANCELLED order and one order that is not eligible (e.g. still PENDING, unpaid).",
    steps: [
      { step: 1, action: "Open the PAID+CANCELLED order's admin detail page.", expected: "Initiate Refund button is visible and enabled." },
      { step: 2, action: "Open the ineligible order's admin detail page.", expected: "No refund action is offered (or it is clearly disabled with a reason)." },
    ],
  },
  {
    id: "REFUND-003", feature: "Refund API authorization", objective: "Verify only authorized roles can call the refund endpoint.",
    preconditions: "A CUSTOMER session token and a SUPPORT_STAFF session token.",
    steps: [
      { step: 1, action: "Call POST /api/admin/orders/[id]/refund as an unauthenticated request.", expected: "401." },
      { step: 2, action: "Call it with a CUSTOMER session.", expected: "403." },
      { step: 3, action: "Call it with an unauthorized staff role (per the authorization matrix).", expected: "403." },
    ],
  },
  {
    id: "IMPORT-001", feature: "Product import — CREATE", objective: "Verify a brand-new SKU creates a product via the import flow.",
    preconditions: "Admin access to Products > Import. A SKU that does not exist yet.",
    steps: [
      { step: 1, action: "Download Product_Import_Template.xlsx, fill one row with a new unique SKU, required fields, and a real category slug.", expected: "File saved." },
      { step: 2, action: "Upload it at Admin > Products > Import.", expected: "Preview shows the row classified CREATE with no errors." },
      { step: 3, action: "Confirm the import.", expected: "A new product exists with exactly the submitted values; ActivityLog has a 'product.imported' entry." },
    ],
  },
  {
    id: "IMPORT-004", feature: "Inventory import — signed adjustment", objective: "Verify inventory import applies a tracked adjustment, not a raw overwrite.",
    preconditions: "Admin access to Inventory > Import. An existing SKU with known current stock.",
    steps: [
      { step: 1, action: "Note the product's current stock.", expected: "Value recorded." },
      { step: 2, action: "Fill Inventory_Import_Template.xlsx with that SKU, Adjustment=+5, Reason=purchase.", expected: "File saved." },
      { step: 3, action: "Upload and confirm at Admin > Inventory > Import.", expected: "Preview shows projected stock = current+5; after confirming, actual stock = current+5 and a new StockMovement (reason=purchase, change=+5) exists." },
    ],
  },
  {
    id: "IMPORT-009", feature: "Import authorization", objective: "Verify unauthenticated and CUSTOMER requests to every new import/export route are rejected.",
    preconditions: "None (unauthenticated) and a CUSTOMER session.",
    steps: [
      { step: 1, action: "Call each of: GET /api/admin/inventory/export, GET /api/admin/categories/export, GET /api/admin/themes/export, GET /api/admin/products/images/export, POST /api/admin/categories/import/parse, POST /api/admin/products/images/import/parse with no session.", expected: "Every one returns 401." },
      { step: 2, action: "Repeat all of them with a CUSTOMER session.", expected: "Every one returns 403." },
    ],
  },
  {
    id: "EXPORT-004", feature: "Formula-injection protection in exports", objective: "Verify a product/category name starting with =, +, -, or @ cannot execute as a formula when the exported file is opened.",
    preconditions: "Admin access. Ability to create/rename a product or category to a name like =2+2 or @SUM(A1).",
    steps: [
      { step: 1, action: "Rename a test product's name to '=2+2' (or create one with that name).", expected: "Save succeeds — the app does not reject unusual product names." },
      { step: 2, action: "Export products (Admin > Products > Export, .xlsx).", expected: "File downloads." },
      { step: 3, action: "Open the exported file in Excel/LibreOffice and inspect that product's Name cell.", expected: "Cell displays the literal text \"=2+2\" (prefixed with a leading apostrophe internally) — it does NOT evaluate to 4 or show a formula bar expression." },
    ],
  },
  {
    id: "SECURITY-001", feature: "Unauthenticated admin API access", objective: "Verify every admin API rejects anonymous requests.",
    preconditions: "No session cookie.",
    steps: [
      { step: 1, action: "Call GET /api/admin/products, GET /api/admin/orders, POST /api/admin/products/import/parse with no cookie.", expected: "Every one returns 401 with no data leaked." },
    ],
  },
  {
    id: "CMS-003", feature: "CMS XSS protection", objective: "Verify a script payload in a CMS text field never executes.",
    preconditions: "Admin access to a CMS text field (e.g. Announcement text, a browse-page title).",
    steps: [
      { step: 1, action: "Set the field's value to <script>alert('xss')</script>.", expected: "Save succeeds — the field accepts arbitrary text." },
      { step: 2, action: "View the storefront page where that text renders.", expected: "The literal text is shown on the page (harmlessly, as plain text); no alert box fires; view-source shows it escaped, not as a live <script> tag." },
    ],
  },

  // --- Module 42: Admin Import/Export Hub UI + Branding logo/favicon fix ---
  {
    id: "IMPORT-010", feature: "Admin Import/Export hub", objective: "Verify the consolidated hub page exposes every bulk operation with correct role gating.",
    preconditions: "Admin access with a role that can manage products/inventory/marketing (e.g. SUPER_ADMIN).",
    steps: [
      { step: 1, action: "Go to Admin > Import / Export (left sidebar).", expected: "Page loads with 5 sections: Products, Inventory, Product Images, Category SEO, Themes." },
      { step: 2, action: "Check the Themes section.", expected: "Only an Export button appears, plus text explaining Theme import/editing is not available — no import controls are offered." },
      { step: 3, action: "Log in instead as a role with only inventory permissions (e.g. INVENTORY_STAFF) and revisit the page.", expected: "Only the Inventory section's Upload & Import button is shown; Products/Images/Category SEO upload buttons are hidden (Export buttons may still show, per each section's own role check)." },
    ],
  },
  {
    id: "IMPORT-011", feature: "Download Template from the hub", objective: "Verify every new Download Template button produces a real, valid .xlsx file.",
    preconditions: "Admin access.",
    steps: [
      { step: 1, action: "From the hub, click Download Template under Inventory.", expected: "An .xlsx file downloads (\"Inventory Import Template.xlsx\")." },
      { step: 2, action: "Open it.", expected: "Contains SKU/Quantity/Reason/Notes columns, example rows, and an Instructions sheet." },
      { step: 3, action: "Repeat for Category SEO and Product Images templates.", expected: "Each downloads a valid, matching-format .xlsx file with its own Instructions sheet." },
    ],
  },
  {
    id: "IMPORT-012", feature: "Import wizard cancellation", objective: "Verify Cancel discards a preview without writing anything.",
    preconditions: "Admin access to any import wizard (e.g. Category SEO Import).",
    steps: [
      { step: 1, action: "Upload a valid file so the Preview screen appears.", expected: "Preview shows row counts (Create/Update/Unchanged/Error)." },
      { step: 2, action: "Click Cancel instead of Confirm Import.", expected: "Returns to the upload screen; no data changes." },
      { step: 3, action: "Check the affected record(s) in the database/admin UI.", expected: "Unchanged — confirms nothing was written during preview or on Cancel." },
    ],
  },
  {
    id: "BRANDING-002", feature: "Desktop logo display", objective: "Verify the header logo renders correctly without distortion on desktop.",
    preconditions: "A logo configured in Settings > Branding (ideally one that isn't a wide wordmark, to genuinely test aspect-ratio handling).",
    steps: [
      { step: 1, action: "Open the storefront at a desktop width (≥1024px).", expected: "Logo appears in the header, clearly visible, not stretched or squashed in either dimension." },
      { step: 2, action: "Compare the logo's proportions to the original uploaded file.", expected: "Same aspect ratio — width:height ratio visually matches the source file." },
    ],
  },
  {
    id: "BRANDING-003", feature: "Mobile logo display", objective: "Verify the header logo renders correctly without distortion on mobile.",
    preconditions: "Same logo as BRANDING-002.",
    steps: [
      { step: 1, action: "Resize the browser (or use device emulation) to 390px wide.", expected: "Logo still appears in the compact mobile header, correctly proportioned, not clipped or overlapping the menu/cart icons." },
    ],
  },
  {
    id: "BRANDING-006", feature: "Portrait logo handling", objective: "Verify a tall/portrait-oriented logo file is not squeezed into a wide box.",
    preconditions: "Admin access; a portrait-oriented image file (taller than wide) available to upload as the logo.",
    steps: [
      { step: 1, action: "Upload the portrait image as the Logo in Settings > Branding and save.", expected: "Saves successfully." },
      { step: 2, action: "View the admin Branding page's own preview panel.", expected: "Logo appears correctly proportioned (not squeezed into a thin sliver) inside the preview box." },
      { step: 3, action: "View the live storefront header (desktop and mobile).", expected: "Same — logo scales to fit the header's box while preserving its true portrait proportions, never distorted." },
    ],
  },
  {
    id: "CONTACT-001", feature: "Edit Contact eyebrow/title", objective: "Verify the previously-hardcoded \"Get in touch\" / \"Contact [Store]\" text is now admin-editable and reflected live.",
    preconditions: "Admin access to Content > Contact Page. Note the current public /contact page text first.",
    steps: [
      { step: 1, action: "Go to Admin > Content > Contact Page.", expected: "Form shows an Eyebrow field (default \"Get in touch\") and a Page Title field (blank by default)." },
      { step: 2, action: "Change Eyebrow to \"We'd love to hear from you\" and Page Title to \"Reach Our Team\". Save.", expected: "Save succeeds." },
      { step: 3, action: "Open the public /contact page (refresh if already open).", expected: "Eyebrow now reads \"We'd love to hear from you\"; heading now reads \"Reach Our Team\" instead of \"Contact [Store Name]\"." },
      { step: 4, action: "Clear the Page Title field back to blank and save, then refresh /contact.", expected: "Heading reverts to \"Contact [Store Name]\" automatically (the built-in fallback) — never a blank heading." },
    ],
  },
  {
    id: "CONTACT-004", feature: "Contact information changes reflect on storefront", objective: "Verify email/phone/address/business hours edits appear correctly and blank fields stay hidden.",
    preconditions: "Admin access to Content > Contact Page.",
    steps: [
      { step: 1, action: "Set Email, Phone, Address, and Business Hours to real-looking QA values. Save.", expected: "Save succeeds." },
      { step: 2, action: "Refresh the public /contact page.", expected: "All four values appear in the contact details grid." },
      { step: 3, action: "Blank out just the Business Hours field. Save. Refresh /contact.", expected: "Business Hours row disappears entirely from the grid; the other three still show — confirms the existing \"blank hides it\" behavior still works after Module 43's additions." },
    ],
  },
  {
    id: "CONTACT-005", feature: "Contact settings authorization", objective: "Verify only authorized admin roles can change Contact page content.",
    preconditions: "A CUSTOMER session and no session at all.",
    steps: [
      { step: 1, action: "Call PATCH /api/admin/content/contact with no session cookie.", expected: "401." },
      { step: 2, action: "Call it with a CUSTOMER session.", expected: "403." },
      { step: 3, action: "Verify the public /contact page content is unchanged after both attempts.", expected: "Unchanged — confirms the rejected requests had no effect." },
    ],
  },

  // --- Module 43: Billing Address checkout behavior ---
  {
    id: "BILLING-001", feature: "Billing setting OFF — no Billing Address UI at all", objective: "Verify the checkout shows NO Billing Address section whatsoever when the setting is OFF (Module 44 correction — earlier behavior showed a plain \"Same as shipping address\" statement; that is no longer correct).",
    preconditions: "Admin sets Allow Different Billing Address = OFF (Settings > Checkout) and saves. Cart has 1+ items.",
    steps: [
      { step: 1, action: "Go to /checkout.", expected: "There is no \"Billing Address\" heading, no \"Same as shipping address\" text, no radio buttons, and no separate form anywhere on the page — the Shipping Address form is immediately followed by Payment." },
      { step: 2, action: "Complete a COD order.", expected: "Order places successfully without ever presenting a billing decision." },
      { step: 3, action: "As admin, open the created order.", expected: "Billing Address stored equals the Shipping Address exactly." },
    ],
  },
  {
    id: "BILLING-002", feature: "Billing setting ON — choice appears", objective: "Verify turning the setting ON makes the Billing Address section (with both options) appear.",
    preconditions: "Admin sets Allow Different Billing Address = ON and saves.",
    steps: [
      { step: 1, action: "Go to /checkout.", expected: "A \"Billing Address\" section now appears with two radio options: \"Same as shipping address\" (selected by default) and \"Use a different billing address\"." },
      { step: 2, action: "Select \"Use a different billing address\".", expected: "A separate billing address form appears below." },
      { step: 3, action: "Select \"Same as shipping address\" again.", expected: "The separate form disappears." },
      { step: 4, action: "Turn the admin setting back OFF and refresh /checkout (new page load).", expected: "The entire Billing Address section disappears again — back to BILLING-001's fully-hidden state." },
    ],
  },
  {
    id: "BILLING-005", feature: "Server-side enforcement when OFF", objective: "Verify a manipulated checkout request can't bypass the store's OFF configuration.",
    preconditions: "Admin setting is OFF. A way to send a raw POST request (browser dev tools / curl / Postman) to /api/checkout.",
    steps: [
      { step: 1, action: "Build a checkout request body with billingSameAsShipping: false and a fabricated billingAddress with a different city, mimicking a tampered client.", expected: "Request prepared." },
      { step: 2, action: "Submit it to POST /api/checkout.", expected: "The order still places successfully (not rejected outright) — but the billing address fabricated in the request is silently ignored." },
      { step: 3, action: "Check the created order's Billing Address.", expected: "Equals the Shipping Address, NOT the fabricated different address — confirms the server, not just the UI, enforces the OFF setting." },
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. Credential Matrix
// ---------------------------------------------------------------------------
const CREDENTIAL_MATRIX: { area: string; canLocally: string; cannotConfirm: string; credentialNeeded: string; laterAction: string }[] = [
  { area: "Razorpay payment", canLocally: "Order/payment record creation up to the point of redirecting to Razorpay's hosted checkout; client-side integration wiring.", cannotConfirm: "That a real payment actually completes and money moves.", credentialNeeded: "Razorpay live (or test) API key + secret.", laterAction: "Complete one real test-mode transaction with Razorpay test cards and verify Payment.status flips to PAID." },
  { area: "Razorpay webhook", canLocally: "Signature verification and finalize logic against a LOCALLY signed payload (scripts/simulate-webhook.ts) — genuine cryptographic/logic test.", cannotConfirm: "That Razorpay's real servers actually deliver the webhook to this app in production.", credentialNeeded: "Razorpay webhook secret + a publicly reachable endpoint.", laterAction: "Configure the real webhook URL in the Razorpay dashboard and trigger one real event." },
  { area: "Razorpay refund", canLocally: "Refund eligibility computation, authorization, duplicate-guard, DB state transitions (scripts/simulate-razorpay-refund.ts).", cannotConfirm: "That money is actually returned to a real customer.", credentialNeeded: "Razorpay live credentials + a real prior paid transaction.", laterAction: "Refund one real low-value test transaction and confirm the amount lands back on the payment method." },
  { area: "Shiprocket shipment", canLocally: "Shipment-request payload construction and the app's own state handling.", cannotConfirm: "That Shiprocket actually creates a real shipment/AWB.", credentialNeeded: "Shiprocket API credentials.", laterAction: "Create one real shipment for a test order and confirm tracking data returns." },
  { area: "Email delivery", canLocally: "Template rendering/content generation for every order/payment/refund event.", cannotConfirm: "That an email actually arrives in an inbox.", credentialNeeded: "SMTP or transactional-email-provider credentials.", laterAction: "Send one real email to a real inbox you control and confirm receipt/formatting." },
  { area: "WhatsApp delivery", canLocally: "Template rendering/content generation.", cannotConfirm: "That a WhatsApp message actually arrives.", credentialNeeded: "WhatsApp Business API credentials.", laterAction: "Send one real message to a real WhatsApp number you control." },
  { area: "Cloudinary", canLocally: "N/A — not integrated in this codebase at all (images are URL/local-storage based).", cannotConfirm: "N/A.", credentialNeeded: "Not applicable unless Cloudinary is adopted in a future module.", laterAction: "Out of scope until a future module explicitly adds it." },
  { area: "Registration / Login / Logout", canLocally: "Fully.", cannotConfirm: "Nothing — fully local.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Admin/Customer authorization", canLocally: "Fully — every role check is server-side and testable with local sessions.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Product/Category/Theme CRUD & import/export", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Cart / Inventory / Stock correction", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "COD order creation", canLocally: "Fully — real order, real stock decrement, no external provider involved.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Shipping calculation / free-shipping threshold", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Billing-address settings (OFF / ON-unchecked / ON-checked)", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Product image URL handling", canLocally: "Fully — URL-based storage, no external provider.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Search / Filters / Responsive UI", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Security authorization (IDOR, XSS, injection, formula-injection)", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Import/export validation", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Database integrity / migration status", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Admin Import/Export hub UI (Module 42)", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Branding logo/favicon display (Module 42)", canLocally: "Fully — URL/file-based, no external provider.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
  { area: "Contact page CMS (Module 43)", canLocally: "Fully.", cannotConfirm: "Nothing.", credentialNeeded: "None.", laterAction: "N/A." },
];

// ---------------------------------------------------------------------------
// 4. Customer Journey
// ---------------------------------------------------------------------------
const CUSTOMER_JOURNEY: { stage: string; action: string; expected: string }[] = [
  { stage: "1. Visitor", action: "Land on homepage, not logged in.", expected: "Homepage renders; header shows Login/Register, not an account menu." },
  { stage: "2. Browse", action: "Navigate via header mega-menu into a category.", expected: "Category page shows only products in that category." },
  { stage: "3. Search", action: "Search for a known product name.", expected: "Search results include that product." },
  { stage: "4. Filter", action: "Apply category + price filter on /shop.", expected: "Result set narrows correctly, combining both filters (AND, not OR)." },
  { stage: "5. Product", action: "Open a product detail page.", expected: "Price, images, description, stock status, reviews all render." },
  { stage: "6. Empty cart", action: "Before adding anything, view /cart.", expected: "Empty-cart state shown, checkout entry point disabled or hidden." },
  { stage: "7. Add to cart", action: "Add the product, quantity 2.", expected: "Cart badge updates to 2; cart page shows the item with correct line total." },
  { stage: "8. Invalid product", action: "Manually visit /product/does-not-exist.", expected: "404 page, not a crash." },
  { stage: "9. Out-of-stock product", action: "Visit a product with stockAvailable=0.", expected: "Add to Cart is disabled; an 'out of stock' indicator is shown." },
  { stage: "10. Quantity change", action: "In cart, increase quantity beyond available stock.", expected: "Blocked at the stock ceiling, not allowed to overshoot." },
  { stage: "11. Coupon", action: "Apply a valid coupon code at checkout (if implemented/active).", expected: "Discount reflected in the order summary." },
  { stage: "12. Free shipping threshold", action: "Add items until the cart crosses the free-shipping threshold.", expected: "Shipping charge drops to zero once crossed." },
  { stage: "13. Checkout — login required", action: "Attempt checkout while logged out.", expected: "Redirected to login (with a safe, same-origin ?redirect= back to checkout) or offered guest checkout, per this app's actual policy." },
  { stage: "14. Address entry", action: "Enter a shipping address.", expected: "Validation enforces required fields; Area/Locality field has a neutral placeholder." },
  { stage: "15. Billing — same as shipping", action: "Leave billing choice at its default.", expected: "No separate billing burden; billing = shipping." },
  { stage: "16. Billing — separate", action: "If the admin setting allows it, opt into a different billing address.", expected: "Separate form appears only after opting in; required only then." },
  { stage: "17. Shipping method", action: "Review computed shipping charge.", expected: "Matches the configured zone/threshold rules." },
  { stage: "18. Payment/COD", action: "Choose COD (or Razorpay up to the credential boundary).", expected: "COD completes locally; Razorpay proceeds to the hosted checkout screen." },
  { stage: "19. Order placed", action: "Complete the order.", expected: "Order confirmation page shows order number, items, totals." },
  { stage: "20. Confirmation", action: "Refresh the confirmation page.", expected: "No duplicate order is created; page still shows the same order." },
  { stage: "21. Account", action: "Go to Account > Orders.", expected: "The new order appears with correct status." },
  { stage: "22. Logout/login", action: "Log out, log back in.", expected: "Order history still visible; cart state handled sensibly (cleared or persisted per this app's actual design)." },
  { stage: "23. Back/forward navigation", action: "Use browser Back after order confirmation.", expected: "Does not re-submit or duplicate the order." },
  { stage: "24. Mobile journey", action: "Repeat steps 5, 7, 14, 18 at a 390px viewport.", expected: "Every step remains usable — no overlapping or cut-off UI." },
];

// ---------------------------------------------------------------------------
// 5. Admin Journey
// ---------------------------------------------------------------------------
const ADMIN_JOURNEY: { stage: string; action: string; expected: string }[] = [
  { stage: "1. Login", action: "Log in with an admin account.", expected: "Redirected to /admin dashboard." },
  { stage: "2. Dashboard", action: "View the dashboard.", expected: "Key metrics (orders, revenue, low stock) render without error." },
  { stage: "3. Products", action: "Open Admin > Products, view/edit/create a product.", expected: "CRUD works; stock/marketing/SEO are edited via their dedicated panels, not the general edit form." },
  { stage: "4. Categories", action: "Open Admin > Categories.", expected: "SEO-only screen, as documented — no name/slug/visibility editing offered (by design)." },
  { stage: "5. Themes", action: "Look for a Theme management screen.", expected: "None exists — confirms Theme is seed-managed only (by design, documented in this module)." },
  { stage: "6. Collections", action: "Check how /collections is populated.", expected: "Driven by existing Category/Theme data and CMS browse-page settings, not a separate Collection admin screen." },
  { stage: "7. Orders", action: "Open Admin > Orders, filter by status, open one order.", expected: "Filtering works; order detail shows full timeline (ActivityLog-backed)." },
  { stage: "8. Inventory", action: "Open Admin > Inventory, adjust one product's stock manually.", expected: "StockMovement recorded; dashboard stock counts update." },
  { stage: "9. CMS", action: "Edit Homepage / About / FAQ content.", expected: "Changes save and reflect live on the storefront immediately." },
  { stage: "10. Homepage", action: "Edit hero banner/announcement.", expected: "Reflected on homepage." },
  { stage: "11. Navigation", action: "Edit a nav menu item label.", expected: "Reflected in the header mega-menu." },
  { stage: "12. SEO", action: "Edit a product's SEO title/description via Marketing panel.", expected: "Reflected in page <title>/meta description." },
  { stage: "13. Settings", action: "Toggle Allow Different Billing Address, Show Filter Sidebar, free-shipping threshold.", expected: "Each setting takes effect on the storefront without a restart." },
  { stage: "14. Notifications", action: "View Admin > Notifications after an order event.", expected: "New notification appears for the relevant staff." },
  { stage: "15. Refund", action: "Open a paid+cancelled order and review refund eligibility.", expected: "Initiate Refund appears only when eligible; clicking it (locally) reaches the credential boundary honestly (labelled, not faked)." },
  { stage: "16. Users/Roles", action: "Open Admin > Users, change a user's role.", expected: "Role change takes effect on that user's next authorization check." },
  { stage: "17. Import/Export", action: "Export products, edit the file, re-import it.", expected: "Round-trips cleanly — SKU matching prevents duplicates." },
];

// ---------------------------------------------------------------------------
// 6. Regression Checklist
// ---------------------------------------------------------------------------
const REGRESSION: { simulator: string; purpose: string; command: string; expected: string }[] = [
  { simulator: "simulate:webhook", purpose: "Razorpay webhook signature verification and finalize logic against a locally signed payload.", command: "npm run simulate:webhook", expected: "All assertions pass; no residual QA data." },
  { simulator: "simulate:cod-risk", purpose: "COD-blocking logic after repeated refused/failed COD deliveries.", command: "npm run simulate:cod-risk", expected: "All assertions pass." },
  { simulator: "simulate:shipment", purpose: "Shipment status/tracking state handling.", command: "npm run simulate:shipment", expected: "All assertions pass." },
  { simulator: "simulate:razorpay-refund", purpose: "Refund eligibility, authorization, duplicate-guard, DB state.", command: "npm run simulate:razorpay-refund", expected: "All assertions pass." },
  { simulator: "simulate:seo", purpose: "Canonical URLs, sitemap, robots.txt, redirects, JSON-LD.", command: "npm run simulate:seo", expected: "All assertions pass." },
  { simulator: "simulate:catalog", purpose: "Category/theme/product catalog browsing and filtering.", command: "npm run simulate:catalog", expected: "All assertions pass." },
  { simulator: "simulate:cms", purpose: "CMS content CRUD and storefront rendering.", command: "npm run simulate:cms", expected: "All assertions pass." },
  { simulator: "simulate:media", purpose: "Image/media handling.", command: "npm run simulate:media", expected: "All assertions pass." },
  { simulator: "simulate:buying-journey", purpose: "Full customer journey, order lifecycle, IDOR, role matrix.", command: "npm run simulate:buying-journey", expected: "All assertions pass." },
  { simulator: "simulate:security", purpose: "Auth/authz, IDOR, XSS, input validation, open redirect.", command: "npm run simulate:security", expected: "All assertions pass." },
  { simulator: "simulate:performance", purpose: "Real request duration/payload size/query-count sanity.", command: "npm run simulate:performance", expected: "Completes; numbers reported are real, not invented." },
  { simulator: "simulate:import-export", purpose: "Product/inventory/category-SEO/image import-export round trip, authorization, formula-injection.", command: "npm run simulate:import-export", expected: "All assertions pass; DB counts match baseline after 3 consecutive runs." },
  { simulator: "TypeScript", purpose: "Whole-project type safety.", command: "npx tsc --noEmit", expected: "0 errors." },
  { simulator: "Production build", purpose: "Whole-project build correctness.", command: "npm run build", expected: "Builds successfully." },
  { simulator: "Migration status", purpose: "Schema drift check.", command: "npx prisma migrate status", expected: "Database schema is up to date, no pending migrations." },
];

// ---------------------------------------------------------------------------
// 7. Security Testing
// ---------------------------------------------------------------------------
const SECURITY: { test: string; how: string; expected: string }[] = [
  { test: "Unauthenticated access to admin API", how: "Call any /api/admin/* route with no session cookie.", expected: "401." },
  { test: "CUSTOMER attempting admin API", how: "Call any /api/admin/* route with a CUSTOMER session.", expected: "403." },
  { test: "SUPPORT_STAFF attempting restricted action", how: "Call a write-only-for-full-admin route (e.g. product delete) as SUPPORT_STAFF.", expected: "403." },
  { test: "Admin authorization", how: "Call the same route as SUPER_ADMIN/ADMIN.", expected: "200, action succeeds." },
  { test: "IDOR — orders", how: "Customer B requests Customer A's order by ID.", expected: "404, not 403 (no existence leak)." },
  { test: "IDOR — addresses", how: "Customer B PATCHes/DELETEs Customer A's saved address.", expected: "404, address unchanged." },
  { test: "Invalid product ID", how: "GET/PATCH a product with a garbage ID.", expected: "404, not 500." },
  { test: "Invalid order ID", how: "GET an order with a garbage ID.", expected: "404, not 500." },
  { test: "Invalid category ID", how: "PATCH a category SEO with a garbage ID.", expected: "404, not 500." },
  { test: "Invalid slug", how: "Visit /product/../../etc or similarly malformed slug.", expected: "404, no path traversal, no server error." },
  { test: "Malicious input — XSS", how: "Submit <script>alert(1)</script> in a review comment / address line / CMS text field.", expected: "Stored and rendered as literal text everywhere, never executes." },
  { test: "SQL/ORM-injection-style input", how: "Submit a string like ' OR '1'='1 in a search box or filter parameter.", expected: "Treated as a literal search string (Prisma parameterizes all queries) — no error, no data leak." },
  { test: "Client-side price manipulation", how: "Tamper with the checkout request body's item price/subtotal/total.", expected: "Server recomputes from real DB prices; tampered values ignored." },
  { test: "Client-side stock manipulation", how: "Tamper with a cart/checkout request's quantity beyond real stock.", expected: "Server rejects or clamps to real available stock." },
  { test: "Client-side refund-amount manipulation", how: "Tamper with a refund request's amount field to exceed the order total.", expected: "Rejected — server computes/validates the refundable amount." },
  { test: "Billing-address bypass — setting ON, missing address", how: "With Allow Different Billing Address = ON, submit a checkout request with billingSameAsShipping=false but no billingAddress.", expected: "Rejected server-side (400) — matches the client's own required-only-when-opted-in rule." },
  { test: "Billing-address bypass — setting OFF, tampered address", how: "With Allow Different Billing Address = OFF, submit a checkout request with billingSameAsShipping=false and a fabricated billingAddress anyway.", expected: "Order still places (not rejected), but the fabricated billing address is silently ignored — the stored Order.billingAddress equals the shipping address, never the tampered value (Module 43)." },
  { test: "Unauthorized import/export", how: "Call any new import/export route (categories, themes, images, inventory) unauthenticated and as CUSTOMER.", expected: "401 / 403 respectively for all of them." },
  { test: "Unauthorized Contact CMS edit", how: "Call PATCH /api/admin/content/contact unauthenticated and as CUSTOMER.", expected: "401 / 403 respectively; public /contact page content unchanged." },
  { test: "File upload validation", how: "Attempt to upload a non-image file via the bulk image uploader, and a file >5MB.", expected: "Rejected with a clear per-file reason, not a crash." },
  { test: "Credential exposure in logs", how: "Trigger a Razorpay-adjacent error and inspect server console output.", expected: "No API key/secret/signature value printed." },
  { test: "Secrets exposed to client bundle", how: "Search the built client JS bundle for RAZORPAY_KEY_SECRET or similar server-only env var names.", expected: "Not present — only NEXT_PUBLIC_-prefixed values may appear client-side." },
  { test: "Formula injection in exports", how: "Export a product/category whose name starts with =, +, -, or @.", expected: "Cell is prefixed with a leading apostrophe internally; does not evaluate as a formula when opened." },
  { test: "Open redirect", how: "Log in via /login?redirect=https://example-external.com.", expected: "Redirected to /account, never to the external URL." },
];

// ---------------------------------------------------------------------------
// 8. SEO Testing
// ---------------------------------------------------------------------------
const SEO: { test: string; how: string; expected: string }[] = [
  { test: "Product canonical URL", how: "View page source of a product page.", expected: "<link rel=canonical> points to the product's own current slug URL, no query params." },
  { test: "Category canonical URL", how: "Same, on a category page.", expected: "Canonical points to /categories/[slug]." },
  { test: "Theme canonical URL", how: "Same, on a theme page.", expected: "Canonical points to /themes/[slug]." },
  { test: "Product metadata", how: "Inspect <title>/<meta description> on a product page with custom SEO fields set.", expected: "Reflects the admin-set seoTitle/seoDesc, falling back sensibly when unset." },
  { test: "Category SEO", how: "Set a category's SEO title via Admin > Categories > SEO, revisit the category page.", expected: "Reflected in <title>." },
  { test: "Theme SEO", how: "Attempt to find a theme SEO field.", expected: "None exists (Theme has no SEO columns) — confirmed absent by design, not a bug." },
  { test: "CMS page SEO", how: "Set SEO fields on a Page, visit /[slug].", expected: "Reflected in <title>/meta description." },
  { test: "Sitemap", how: "Visit /sitemap.xml.", expected: "Includes every ACTIVE product/visible category/enabled theme/published page; excludes DRAFT/ARCHIVED/hidden ones." },
  { test: "robots.txt", how: "Visit /robots.txt.", expected: "Disallows /admin, /account, /checkout, /api; allows the public catalog." },
  { test: "JSON-LD", how: "Inspect a product page's <script type=application/ld+json>.", expected: "Valid Product schema with name/price/availability." },
  { test: "404 handling", how: "Visit a nonexistent product/category/theme slug.", expected: "Clean 404 page, correct HTTP status." },
  { test: "308 product slug redirect", how: "Change a product's slug via admin edit or import, then visit its OLD slug URL.", expected: "308 redirect to the new slug, no redirect loop." },
  { test: "noindex on private pages", how: "Inspect <meta name=robots> on /account, /checkout, /cart.", expected: "noindex present." },
  { test: "Filter/query-param noindex", how: "Visit /shop?category=rugs&sort=price.", expected: "Either canonicalizes to the unfiltered URL or is marked noindex, per this app's actual SEO policy — never indexed as a duplicate of /shop." },
  { test: "OG/Twitter metadata", how: "Inspect og:title/og:image/twitter:card on a product page.", expected: "Present and populated from real product data." },
  { test: "SearchAction", how: "Inspect homepage JSON-LD for a WebSite/SearchAction block.", expected: "Present if implemented; if not implemented, documented as such rather than assumed." },
];

// ---------------------------------------------------------------------------
// 9. Responsive/UI Testing
// ---------------------------------------------------------------------------
const RESPONSIVE_BREAKPOINTS = ["1440px", "1280px", "1024px", "768px", "390px", "375px"];
const RESPONSIVE_COMPONENTS = [
  "Header", "Search", "Mega-menu", "Cart drawer/page", "Product cards", "Filter sidebar",
  "Product detail page", "Checkout form", "Admin sidebar", "Admin header", "Forms (inputs/selects)",
  "Tables (admin lists)", "Modals", "Buttons", "Horizontal overflow", "Sticky/fixed elements",
];
const RESPONSIVE: { breakpoint: string; component: string; check: string }[] = RESPONSIVE_BREAKPOINTS.flatMap((bp) =>
  RESPONSIVE_COMPONENTS.map((c) => ({
    breakpoint: bp,
    component: c,
    check: `At ${bp}, verify ${c} has no overlap, no horizontal scroll on the page body, and remains fully usable (tap targets reachable, text not clipped).`,
  }))
);

// ---------------------------------------------------------------------------
// 10. Test Data / Cleanup
// ---------------------------------------------------------------------------
const TEST_DATA_RULES: string[] = [
  "Use email addresses ending in @example.test for every QA account created during manual testing — never a real inbox.",
  "Prefix any QA-created order/product/user identifier with a recognizable marker (e.g. QA- or a run-specific suffix) so it's never mistaken for real business data.",
  "Never edit or delete a real (non-QA) product, category, order, or customer record while testing.",
  "Never run destructive database commands (prisma migrate reset, prisma db push --force-reset, DROP/TRUNCATE) during testing.",
  "Before starting a test session, record current row counts for: users, products, categories, themes, orders, orderItems, payments, reviews, stockMovements, activityLogs, notifications, settings, pages, product images.",
  "Any stock change made during testing must be reversed through the real admin Stock panel or Inventory Import (a tracked, reasoned adjustment) — never a raw database edit.",
  "After a test session, delete every QA user/order/product created, and confirm no QA rows remain (query by the @example.test / QA- markers).",
  "After cleanup, re-check the row counts from the pre-test baseline — they must match exactly, except for any deliberate, disclosed audit correction.",
  "If a test failure leaves orphaned QA data, clean it up manually and note it in Tester Notes before re-running the test.",
  "Restore every Setting you changed for a test (e.g. Allow Different Billing Address, Show Filter Sidebar) back to its original value when done.",
];

async function main() {
  const wb = new ExcelJS.Workbook();

  addSheet(
    wb, "Test Case Index",
    [
      { key: "id", header: "Test Case ID", width: 16 }, { key: "area", header: "Module/Area", width: 16 },
      { key: "feature", header: "Feature", width: 40 }, { key: "priority", header: "Priority", width: 10 },
      { key: "type", header: "Test Type", width: 16 }, { key: "credential", header: "Credential Required?", width: 18 },
      { key: "local", header: "Local Testing Possible?", width: 18 }, { key: "preconditions", header: "Preconditions", width: 40 },
      { key: "status", header: "Status", width: 14 }, { key: "lastTested", header: "Last Tested", width: 14 },
      { key: "notes", header: "Tester Notes", width: 30 },
    ],
    INDEX.map((r) => ({ ...r, status: "Not Run", lastTested: "", notes: "" }))
  );

  const manualColumns = [
    { key: "id", header: "Test Case ID", width: 16 }, { key: "feature", header: "Feature", width: 32 },
    { key: "objective", header: "Objective", width: 40 }, { key: "preconditions", header: "Preconditions", width: 34 },
    { key: "step", header: "Step #", width: 8 }, { key: "action", header: "Exact Action", width: 45 },
    { key: "expected", header: "Expected Result", width: 45 }, { key: "actual", header: "Actual Result", width: 30 },
    { key: "pass", header: "Pass/Fail", width: 10 }, { key: "notes", header: "Notes", width: 25 },
  ];
  const manualRows: Record<string, string>[] = [];
  for (const c of MANUAL_CASES) {
    for (const s of c.steps) {
      manualRows.push({
        id: c.id, feature: c.feature, objective: c.objective, preconditions: c.preconditions,
        step: String(s.step), action: s.action, expected: s.expected, actual: "", pass: "", notes: "",
      });
    }
  }
  addSheet(wb, "Manual Test Cases", manualColumns, manualRows);

  addSheet(
    wb, "Credential Matrix",
    [
      { key: "area", header: "Area", width: 26 }, { key: "canLocally", header: "Can Be Tested Locally", width: 50 },
      { key: "cannotConfirm", header: "Cannot Be Confirmed Locally", width: 40 }, { key: "credentialNeeded", header: "Credential Required", width: 32 },
      { key: "laterAction", header: "Exact Production/Test Action Required Later", width: 50 },
    ],
    CREDENTIAL_MATRIX
  );

  addSheet(
    wb, "Customer Journey",
    [{ key: "stage", header: "Stage", width: 26 }, { key: "action", header: "Action", width: 45 }, { key: "expected", header: "Expected Behavior", width: 50 }],
    CUSTOMER_JOURNEY
  );

  addSheet(
    wb, "Admin Journey",
    [{ key: "stage", header: "Stage", width: 22 }, { key: "action", header: "Action", width: 45 }, { key: "expected", header: "Expected Behavior", width: 50 }],
    ADMIN_JOURNEY
  );

  addSheet(
    wb, "Regression Checklist",
    [
      { key: "simulator", header: "Simulator", width: 26 }, { key: "purpose", header: "Purpose", width: 45 },
      { key: "command", header: "Command", width: 30 }, { key: "expected", header: "Expected Result", width: 35 },
      { key: "lastRun", header: "Last Run", width: 14 }, { key: "result", header: "Result", width: 14 }, { key: "notes", header: "Notes", width: 25 },
    ],
    REGRESSION.map((r) => ({ ...r, lastRun: "", result: "", notes: "" }))
  );

  addSheet(
    wb, "Security Testing",
    [{ key: "test", header: "Test", width: 34 }, { key: "how", header: "How To Test", width: 50 }, { key: "expected", header: "Expected Result", width: 45 }],
    SECURITY
  );

  addSheet(
    wb, "SEO Testing",
    [{ key: "test", header: "Test", width: 28 }, { key: "how", header: "How To Test", width: 45 }, { key: "expected", header: "Expected Result", width: 45 }],
    SEO
  );

  addSheet(
    wb, "Responsive-UI Testing",
    [{ key: "breakpoint", header: "Breakpoint", width: 14 }, { key: "component", header: "Component", width: 22 }, { key: "check", header: "Check", width: 80 }],
    RESPONSIVE
  );

  const cleanupSheet = wb.addWorksheet("Test Data - Cleanup");
  cleanupSheet.columns = [{ header: "Rule", key: "rule", width: 110 }];
  cleanupSheet.getRow(1).font = { bold: true };
  TEST_DATA_RULES.forEach((rule) => cleanupSheet.addRow({ rule }));
  styleHeader(cleanupSheet);

  const buf = await wb.xlsx.writeBuffer();
  const outPath = path.join(OUT_DIR, "Store_QA_Test_Cases.xlsx");
  writeFileSync(outPath, Buffer.from(buf));
  console.log(`Wrote ${outPath} (${Buffer.from(buf).length} bytes), ${wb.worksheets.length} sheets.`);
}

main().catch((err) => {
  console.error("QA workbook generation failed:", err);
  process.exitCode = 1;
});
