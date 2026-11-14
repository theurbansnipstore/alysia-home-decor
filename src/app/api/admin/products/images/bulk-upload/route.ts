import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { getStorageProvider, PRODUCT_IMAGE_FOLDER } from "@/lib/storage";

const MAX_FILES = 50;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// KTR-001-1.jpg -> sku "KTR-001", position 1. Greedy match on the SKU
// group naturally backtracks to the last "-<digits>.<ext>" in the filename,
// so SKUs containing their own hyphens (the normal case) still parse right.
const FILENAME_PATTERN = /^(.+)-(\d+)\.(jpe?g|png|webp|gif)$/i;

interface SkippedFile {
  filename: string;
  reason: string;
}

/** Bulk image association by filename convention (Section 11): admins
 *  upload many files at once from anywhere on disk — they don't have to be
 *  on one product's edit page — and each file's SKU prefix determines which
 *  product it's attached to, with the numeric suffix setting sort order. */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("Expected multipart/form-data.", 400);
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return apiError("No files provided.", 400);
  if (files.length > MAX_FILES) return apiError(`Upload at most ${MAX_FILES} files at a time.`, 400);

  const skipped: SkippedFile[] = [];
  const parsedFiles: { file: File; sku: string; position: number }[] = [];

  for (const file of files) {
    const match = file.name.match(FILENAME_PATTERN);
    if (!match) {
      skipped.push({ filename: file.name, reason: 'Filename must match "SKU-position.ext", e.g. KTR-001-1.jpg.' });
      continue;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      skipped.push({ filename: file.name, reason: `Unsupported file type: ${file.type || "unknown"}.` });
      continue;
    }
    if (file.size > MAX_BYTES) {
      skipped.push({ filename: file.name, reason: "Larger than 5MB." });
      continue;
    }
    parsedFiles.push({ file, sku: match[1], position: parseInt(match[2], 10) });
  }

  if (parsedFiles.length === 0) {
    return apiSuccess({ uploaded: 0, skipped });
  }

  const skus = Array.from(new Set(parsedFiles.map((f) => f.sku)));
  const products = await prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } });
  const productBySku = new Map(products.map((p) => [p.sku, p.id]));

  const storage = getStorageProvider();
  let uploaded = 0;

  for (const { file, sku, position } of parsedFiles) {
    const productId = productBySku.get(sku);
    if (!productId) {
      skipped.push({ filename: file.name, reason: `No product with SKU "${sku}".` });
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await storage.upload({ buffer, filename: file.name, contentType: file.type, folder: PRODUCT_IMAGE_FOLDER });
      await prisma.productImage.create({
        data: {
          productId,
          url: result.url,
          storageKey: result.storageKey,
          altText: null,
          sortOrder: position - 1,
          purpose: "PRODUCT",
        },
      });
      uploaded++;
    } catch (err) {
      console.error("[bulk image upload]", file.name, err);
      skipped.push({ filename: file.name, reason: "Upload failed — see server logs." });
    }
  }

  return apiSuccess({ uploaded, skipped });
}
