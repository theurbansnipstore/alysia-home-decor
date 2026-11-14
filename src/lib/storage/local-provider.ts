import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { StorageProvider, UploadInput, UploadResult } from "@/lib/storage/provider";

// Dev/small-catalog default: writes into public/<folder>/... so files are
// served directly by Next.js's static file handling, no separate server
// needed. Works with zero configuration — no account, no API keys. Not a
// production-scale solution (files live on this machine's disk, don't
// survive a redeploy on most hosts) — see CloudinaryProvider for the
// swap-in path when that matters.
const PUBLIC_DIR = path.join(process.cwd(), "public");

function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return ext && ext.length <= 6 ? ext : ".jpg";
}

export class LocalStorageProvider implements StorageProvider {
  async upload({ buffer, filename, folder }: UploadInput): Promise<UploadResult> {
    const key = `${folder}/${randomUUID()}${safeExt(filename)}`;
    const absolutePath = path.join(PUBLIC_DIR, key);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return { url: `/${key}`, storageKey: key };
  }

  async remove(storageKey: string): Promise<void> {
    const absolutePath = path.join(PUBLIC_DIR, storageKey);
    if (!absolutePath.startsWith(PUBLIC_DIR)) return; // refuse to touch anything outside public/
    try {
      await unlink(absolutePath);
    } catch {
      // Already gone — not an error for our purposes.
    }
  }
}
