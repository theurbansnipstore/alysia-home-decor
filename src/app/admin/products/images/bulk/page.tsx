import { requireRole } from "@/lib/session";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import BulkImageUploader from "@/components/admin/products/BulkImageUploader";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function BulkProductImagesPage() {
  await requireRole(FULL_PRODUCT_ADMIN_ROLES);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: "Bulk Images" }]} />
      <h1 className="mb-2 font-display text-2xl text-ink">Bulk Image Upload</h1>
      <p className="mb-2 max-w-2xl text-sm text-ink-500">
        Select many image files at once. Each filename must be{" "}
        <code className="bg-ink-100 px-1">SKU-position.ext</code>, e.g. <code className="bg-ink-100 px-1">KTR-001-1.jpg</code>,{" "}
        <code className="bg-ink-100 px-1">KTR-001-2.jpg</code>. The SKU prefix determines which product the image
        belongs to; the number determines its position in that product&apos;s gallery.
      </p>
      <p className="mb-6 max-w-2xl text-sm text-ink-500">
        Already have images hosted elsewhere by URL instead of files on your computer? Use{" "}
        <a href="/admin/products/images/import" className="text-brass-600 hover:underline">
          Image Import (by URL)
        </a>{" "}
        instead.
      </p>
      <BulkImageUploader />
    </div>
  );
}
