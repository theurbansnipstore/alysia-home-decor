import "server-only";
import { createHash } from "crypto";
import type { StorageProvider, UploadInput, UploadResult } from "@/lib/storage/provider";

// Talks to Cloudinary's plain REST upload API directly (signed requests)
// rather than the cloudinary npm SDK, so this provider adds zero new
// dependencies — it only activates if the three env vars below are set.
// See the image-storage report section for cost/setup/security notes.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export function isCloudinaryConfigured(): boolean {
  return !!(CLOUD_NAME && API_KEY && API_SECRET);
}

function sign(params: Record<string, string | number>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + API_SECRET).digest("hex");
}

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    if (!isCloudinaryConfigured()) {
      throw new Error(
        "Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
      );
    }
  }

  async upload({ buffer, filename, contentType, folder }: UploadInput): Promise<UploadResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ folder, timestamp });

    const form = new FormData();
    form.append("file", new Blob([buffer], { type: contentType }), filename);
    form.append("api_key", API_KEY!);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Cloudinary upload failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { secure_url: string; public_id: string };
    return { url: json.secure_url, storageKey: json.public_id };
  }

  async remove(storageKey: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: storageKey, timestamp });

    const form = new FormData();
    form.append("public_id", storageKey);
    form.append("api_key", API_KEY!);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      body: form,
    }).catch(() => {
      // Best-effort — a failed remote delete shouldn't block removing the DB row.
    });
  }
}
