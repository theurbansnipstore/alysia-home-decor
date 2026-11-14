import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_media";

/**
 * A named-URL registry, not a file-upload system — no upload provider
 * exists anywhere in this project (confirmed: Module 10's admin product
 * images are added by URL too), and installing one is out of scope.
 * Gives admin a place to save/label image URLs for reuse across settings
 * forms (Branding logo, Homepage section images, etc.), which otherwise
 * are plain URL text inputs.
 */
export interface MediaItemSetting {
  id: string;
  url: string;
  altText: string;
  label: string;
  createdAt: string;
}

export interface MediaSettings {
  items: MediaItemSetting[];
}

export const DEFAULT_MEDIA: MediaSettings = { items: [] };

export async function getMediaSettings(): Promise<MediaSettings> {
  return getStoreSetting(KEY, DEFAULT_MEDIA);
}

export async function setMediaSettings(value: MediaSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
