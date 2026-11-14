import "server-only";
import type { StorageProvider } from "@/lib/storage/provider";
import { LocalStorageProvider } from "@/lib/storage/local-provider";
import { CloudinaryStorageProvider, isCloudinaryConfigured } from "@/lib/storage/cloudinary-provider";

export type { StorageProvider, UploadInput, UploadResult } from "@/lib/storage/provider";

/**
 * Selection is env-driven, not hardcoded, so switching providers later is a
 * config change: set STORAGE_PROVIDER=cloudinary plus the three Cloudinary
 * env vars. Defaults to local disk when unset — every environment works
 * out of the box with no account/credentials required.
 */
export function getStorageProvider(): StorageProvider {
  const requested = process.env.STORAGE_PROVIDER || "local";
  if (requested === "cloudinary") {
    if (!isCloudinaryConfigured()) {
      throw new Error(
        "STORAGE_PROVIDER=cloudinary but CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET are not set."
      );
    }
    return new CloudinaryStorageProvider();
  }
  return new LocalStorageProvider();
}

export const PRODUCT_IMAGE_FOLDER = "uploads/products";
