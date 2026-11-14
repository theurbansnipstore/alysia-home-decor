# Daily Business Excel Import/Export — How To Use This

This folder holds the Excel templates for day-to-day catalog operations. Every import goes through the application's real, authorized API — nothing here bypasses the app or edits the database directly. **You should never need to manually touch Prisma or the database for a routine operation described below.**

## Which file do I use for what?

| I want to... | Use this file | How |
|---|---|---|
| Bulk-create or update products | `Product_Import_Template.xlsx` | Admin > Products > Import |
| See my current products in the right format | `Product_Export_Template.xlsx` (format sample) — real data via Admin > Products > Export | |
| Adjust stock (restock, correction, damage, etc.) | `Inventory_Import_Template.xlsx` | Admin > Inventory > Import |
| See current stock levels | `Inventory_Export_Template.xlsx` (format sample) — real data via `GET /api/admin/inventory/export?format=xlsx` | |
| Update a category's SEO title/description | `Category_Import_Template.xlsx` | `POST /api/admin/categories/import/parse` then `/apply` |
| See current categories | `Category_Export_Template.xlsx` (format sample) — real data via `GET /api/admin/categories/export?format=xlsx` | |
| See current themes (reference only — no import exists) | `Theme_Export_Template.xlsx` / `Theme_Import_Template.xlsx` | `GET /api/admin/themes/export?format=xlsx` |
| Add or update product images by URL | `Product_Image_Import_Template.xlsx` | `POST /api/admin/products/images/import/parse` then `/apply` |
| See current product images | `Product_Image_Export_Template.xlsx` (format sample) — real data via `GET /api/admin/products/images/export?format=xlsx` | |
| One file with everything for daily review | `Master_Catalog_Template.xlsx` | Reference workbook — see its Instructions sheet |

## Do I need to manually update Prisma when using these files?

**No.** Every import in this system goes through the application's existing, authorized API routes (the same ones the admin UI itself uses), which update the database via Prisma automatically, with the same validation, business rules, and audit logging as using the admin screens by hand. You should never hand-edit the database for a routine catalog operation covered here.

**The one honest exception**: Category name, slug, description, image, parent, sort order, and visibility, and everything about Theme, have no admin-writable API in this application at all today (see "What can't be imported, and why" below) — those genuinely can only be changed via direct database access (e.g. Prisma Studio) or the seed file, until a dedicated admin screen is built for them in a future module. This is a real, disclosed limitation of the current application, not something this module's Excel layer works around.

## How to export products

Admin > Products > Export (or `GET /api/admin/products/export?format=xlsx&scope=all`). Downloads a live snapshot in exactly the format shown in `Product_Export_Template.xlsx`.

## How to edit products

Open the exported file (or `Product_Import_Template.xlsx` for a blank starting point), edit rows, save.

- **SKU is the only matching key.** A row with an existing SKU updates that product. A row with a new SKU creates one.
- **A blank cell on an existing product always means "leave this field unchanged"** — it is never treated as "clear this value."
- Required fields for a **new** product: SKU, Product Name, Description, Price, Category. Everything else is optional with sensible defaults.
- Category/Theme are entered as their **slug** (e.g. `rugs`, `coastal`), not their display name.

## How to import products

Admin > Products > Import → upload the file → review the preview (rows are classified Create / Update / Unchanged / Error, nothing is written yet) → confirm. Re-uploading the same file twice never creates duplicates.

## How to update inventory

`Inventory_Import_Template.xlsx`: one row per SKU with a **signed Quantity** (e.g. `+10` or `-2`), a Reason from the fixed allowed list (`purchase, restock, damage, lost, correction, return, other`), and an optional Note. This is never a direct stock overwrite — every row is applied as a tracked adjustment through the same service the single-product Stock panel uses, so it can never push stock below zero and always leaves a StockMovement audit row.

## How to add product images

`Product_Image_Import_Template.xlsx`: one row per (SKU, Image URL). A URL the product doesn't have yet creates a new image; a URL it already has updates only that image's Alt Text / Sort Order / Purpose. Images are referenced by URL, not uploaded as binary data in this file — this application's images are URL-based (not Cloudinary-integrated). To upload new binary image **files**, use the existing Admin > Products > Bulk Images tool instead (filename convention `SKU-position.jpg`), which is unrelated to and unchanged by this system.

There is no "primary image" flag in the database — Sort Order `0` is the app-wide convention for the main image. There is no per-image visibility toggle — every image on a product is always shown; deleting one is only done from the admin UI, not via this file.

## How to update SEO

- **Product SEO** — via `Product_Import_Template.xlsx`'s existing columns is not currently included (product SEO title/description are edited via the admin Marketing panel per product) — use `Master_Catalog_Template.xlsx`'s SEO sheet as a reference-only view of current values.
- **Category SEO** — via `Category_Import_Template.xlsx`, the only two category fields this application lets an admin change today.
- **Theme SEO** — does not exist. The Theme database model has no SEO columns at all.

## What can't be imported, and why

| Entity | What's missing | Why |
|---|---|---|
| Category name/slug/description/image/parent/sort order/visibility | No admin write API exists for these fields anywhere in this codebase — only SEO Title/Description are admin-writable (the same narrow scope the Admin > Categories > SEO screen already has). | Building full category CRUD is a separate, larger feature (a new authorized API surface, and likely a slug-redirect system mirroring the product one) — out of this module's "Excel over existing architecture" scope. |
| Theme — everything | No admin write API, no admin page, and the database model itself has no SEO columns. 100% seed-managed. | Same reasoning, one step further — there is nothing to reuse at all. |
| Product Variants — bulk import | A working single-variant admin API exists (create/update/delete per product), but it's not wired into cart/checkout — a variant can't actually be purchased today. | Out of scope to extend a feature the rest of the app doesn't use yet. Use the per-product Variant panel for one-off changes; see `Master_Catalog_Template.xlsx`'s Variants sheet for read-only reference. |
| Per-image visibility toggle | No such column exists on ProductImage. | Not invented for this module — see Product Images above. |

## How to handle errors

Every import (product, inventory, category SEO, image) previews before writing anything — you'll see each row classified Create/Update/Unchanged/**Error** with a specific reason before confirming. Fix the flagged rows in your spreadsheet and re-upload; nothing partial is ever written for a row that failed validation.

## How SKU works

SKU is the single stable identifier for a product across export, product import, inventory import, and image import. It must be unique, is matched exactly (case-sensitive), and is never regenerated or renumbered by any import in this system.

## How slug changes work

Changing a product's Slug column in `Product_Import_Template.xlsx` runs through the exact same slug-redirect logic as editing it by hand in the admin UI (`recordSlugChange()`) — the product's old URL keeps working via a 308 redirect. This is never bypassed by a direct database write. Category has no slug-redirect system at all (matching that it has no slug-write API in the first place).

## How stock adjustments work

Never a direct overwrite. `Inventory_Import_Template.xlsx` rows are signed deltas applied one at a time, in file order, through the real stock-adjustment service — every change is reason-coded and recorded as a `StockMovement` row, and an adjustment that would take stock below zero is rejected for that row (without blocking the rest of the file).

## What requires admin permission

Every route in this system requires an authenticated admin session with the appropriate role — the same roles the rest of the admin area already uses (product-area roles for products/images, stock-admin roles for inventory, marketing-admin roles for category SEO/themes). Unauthenticated requests get 401; a logged-in customer or an under-privileged staff role gets 403. Verified live by `scripts/simulate-import-export.ts`.

## How to safely test locally

Run `npm run simulate:import-export` against your local dev server and local database. It creates its own clearly-marked QA product/customer, exercises every import/export path (including the error paths), and deletes everything it created — verified by comparing database row counts before and after. Safe to run repeatedly; it never touches real catalog data. `npm run simulate:import-export -- --keep` skips cleanup if you want to inspect the QA data it created.

## Which operations can be performed without external credentials

**All of them.** Nothing in this import/export system depends on Razorpay, Shiprocket, email, WhatsApp, or Cloudinary — it is pure catalog/inventory/CMS data flowing through Prisma and this application's own database. Every template, every import, every export in this folder is fully testable and usable with zero external credentials.
