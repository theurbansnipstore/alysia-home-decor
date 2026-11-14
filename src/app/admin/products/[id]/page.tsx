import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { getAdminProductById } from "@/lib/data/admin-products";
import { getAllCategoriesAdmin } from "@/lib/data/categories";
import { getAllThemesAdmin } from "@/lib/data/themes";
import { getStockMovementHistory } from "@/lib/inventory/stock-service";
import { WELL_KNOWN_ATTRIBUTE_LABELS } from "@/lib/admin/product-attributes";
import ProductForm from "@/components/admin/products/ProductForm";
import ProductImageManager from "@/components/admin/products/ProductImageManager";
import ProductVariantManager from "@/components/admin/products/ProductVariantManager";
import ProductAttributeManager from "@/components/admin/products/ProductAttributeManager";
import StockAdjustmentPanel from "@/components/admin/products/StockAdjustmentPanel";
import MarketingPanel from "@/components/admin/products/MarketingPanel";
import ArchiveButton from "@/components/admin/products/ArchiveButton";
import RedirectHistoryPanel from "@/components/admin/products/RedirectHistoryPanel";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireRole(FULL_PRODUCT_ADMIN_ROLES);

  const [product, categories, themes] = await Promise.all([
    getAdminProductById(params.id),
    getAllCategoriesAdmin(),
    getAllThemesAdmin(),
  ]);
  if (!product) notFound();

  const history = await getStockMovementHistory(product.id, 20);
  const attr = (label: string) => product.attributes.find((a) => a.label === label)?.value ?? "";

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: "Edit Product" }]} />

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">{product.name}</h1>
        <ArchiveButton productId={product.id} status={product.status} />
      </div>

      <ProductForm
        mode="edit"
        productId={product.id}
        categories={categories}
        themes={themes}
        initial={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          discountPrice: product.discountPrice,
          sku: product.sku,
          barcode: product.barcode,
          brand: product.brand,
          weightGrams: product.weightGrams,
          dimensions: product.dimensions,
          tags: product.tags,
          status: product.status,
          categoryId: product.categoryId,
          themeId: product.themeId,
          lowStockAt: product.lowStockAt,
          returnPolicyOverride: product.returnPolicyOverride,
          material: attr(WELL_KNOWN_ATTRIBUTE_LABELS[0]),
          color: attr(WELL_KNOWN_ATTRIBUTE_LABELS[1]),
          width: attr(WELL_KNOWN_ATTRIBUTE_LABELS[2]),
          height: attr(WELL_KNOWN_ATTRIBUTE_LABELS[3]),
          careInstructions: attr(WELL_KNOWN_ATTRIBUTE_LABELS[4]),
        }}
      />

      <RedirectHistoryPanel currentSlug={product.slug} redirects={product.slugRedirects} />

      <ProductImageManager productId={product.id} initial={product.images} />

      <ProductVariantManager productId={product.id} initial={product.variants} />

      <ProductAttributeManager productId={product.id} initial={product.attributes} />

      <StockAdjustmentPanel
        productId={product.id}
        productName={product.name}
        sku={product.sku}
        initialStock={product.stockAvailable}
        lowStockAt={product.lowStockAt}
        initialHistory={history}
      />

      <MarketingPanel
        productId={product.id}
        productName={product.name}
        productDescription={product.description}
        productSlug={product.slug}
        productStatus={product.status}
        initial={{
          isFeatured: product.isFeatured,
          isBestSeller: product.isBestSeller,
          isTrending: product.isTrending,
          isNewArrival: product.isNewArrival,
          seoTitle: product.seoTitle,
          seoDesc: product.seoDesc,
        }}
      />
    </div>
  );
}
