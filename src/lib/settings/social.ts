import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_social";

export interface SocialLinkSetting {
  id: string;
  platform: "instagram" | "facebook" | "youtube" | "pinterest" | "twitter" | "other";
  label: string;
  url: string;
  enabled: boolean;
  sortOrder: number;
}

export interface SocialSettings {
  links: SocialLinkSetting[];
}

/**
 * Pre-seeded with the platforms Footer.tsx's icons already reference
 * (Instagram/Facebook/Twitter — currently href="#" placeholders, no real
 * URL exists anywhere in the codebase) plus YouTube/Pinterest per this
 * module's requested platform list. All disabled with empty URLs by
 * default — NOT inventing real handles/URLs, since none exist today
 * (checked brand.ts, .env, every config file — genuinely nothing to
 * default to beyond the platform names themselves).
 */
export const DEFAULT_SOCIAL: SocialSettings = {
  links: [
    { id: "instagram", platform: "instagram", label: "Instagram", url: "", enabled: false, sortOrder: 0 },
    { id: "facebook", platform: "facebook", label: "Facebook", url: "", enabled: false, sortOrder: 1 },
    { id: "youtube", platform: "youtube", label: "YouTube", url: "", enabled: false, sortOrder: 2 },
    { id: "pinterest", platform: "pinterest", label: "Pinterest", url: "", enabled: false, sortOrder: 3 },
    { id: "twitter", platform: "twitter", label: "X / Twitter", url: "", enabled: false, sortOrder: 4 },
  ],
};

export async function getSocialSettings(): Promise<SocialSettings> {
  return getStoreSetting(KEY, DEFAULT_SOCIAL);
}

export async function setSocialSettings(value: SocialSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
