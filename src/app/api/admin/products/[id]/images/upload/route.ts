import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { getStorageProvider, PRODUCT_IMAGE_FOLDER } from "@/lib/storage";
import type { ImagePurpose } from "@prisma/client";

const MAX_FILES = 10;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB per file
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PURPOSES: ImagePurpose[] = ["PRODUCT", "LIFESTYLE", "DETAIL"];

/** Real file uploads (multipart/form-data) — separate from the URL-based
 *  POST on the parent route, which stays for admins who prefer pasting an
 *  existing image URL. Both write to the same ProductImage table. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  const product = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!product) return apiError("Product not found", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("Expected multipart/form-data.", 400);
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return apiError("No files provided.", 400);
  if (files.length > MAX_FILES) return apiError(`Upload at most ${MAX_FILES} images at a time.`, 400);

  const purposeRaw = form.get("purpose");
  const purpose: ImagePurpose = PURPOSES.includes(purposeRaw as ImagePurpose) ? (purposeRaw as ImagePurpose) : "PRODUCT";

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError(`Unsupported file type: ${file.type || file.name}. Use JPEG, PNG, WebP, or GIF.`, 400);
    }
    if (file.size > MAX_BYTES) {
      return apiError(`${file.name} is larger than 5MB.`, 400);
    }
  }

  try {
    const storage = getStorageProvider();
    const last = await prisma.productImage.findFirst({
      where: { productId: params.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    let nextSortOrder = (last?.sortOrder ?? -1) + 1;

    const created = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await storage.upload({
        buffer,
        filename: file.name,
        contentType: file.type,
        folder: PRODUCT_IMAGE_FOLDER,
      });
      const image = await prisma.productImage.create({
        data: {
          productId: params.id,
          url: uploaded.url,
          storageKey: uploaded.storageKey,
          altText: null,
          sortOrder: nextSortOrder++,
          purpose,
        },
      });
      created.push(image);
    }

    return apiSuccess(created, 201);
  } catch (err) {
    console.error("[POST /api/admin/products/[id]/images/upload]", err);
    return apiError("Failed to upload image(s).", 500);
  }
}
