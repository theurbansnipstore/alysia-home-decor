import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { getStorageProvider } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matching the product image uploader's limit
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MEDIA_FOLDER = "uploads/media";

/**
 * Module 38 Part 1/2 — the Media library was URL-entry only, even though a
 * real upload provider already exists in this project (src/lib/storage —
 * local disk by default, Cloudinary if STORAGE_PROVIDER=cloudinary is
 * configured), used today only by product image uploads. Reusing that same
 * provider here — not introducing a new one — gives Media a real "Upload"
 * option alongside "paste a URL", without a second storage system.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("Expected multipart/form-data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return apiError("No file provided.", 400);
  if (!ALLOWED_TYPES.has(file.type)) {
    return apiError(`Unsupported file type: ${file.type || file.name}. Use JPEG, PNG, WebP, or GIF.`, 400);
  }
  if (file.size > MAX_BYTES) return apiError(`${file.name} is larger than 5MB.`, 400);

  try {
    const storage = getStorageProvider();
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await storage.upload({ buffer, filename: file.name, contentType: file.type, folder: MEDIA_FOLDER });
    return apiSuccess({ url: uploaded.url }, 201);
  } catch (err) {
    console.error("[POST /api/admin/content/media/upload]", err);
    return apiError("Failed to upload image.", 500);
  }
}
