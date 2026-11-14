import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_announcement";

export interface AnnouncementSettings {
  enabled: boolean;
  text: string;
  link: string;
}

/** Matches today's hardcoded AnnouncementBar text exactly, with no link — an unconfigured store renders identically to today. */
export const DEFAULT_ANNOUNCEMENT: AnnouncementSettings = {
  enabled: true,
  text: "Complimentary shipping on orders over ₹2,999",
  link: "",
};

export async function getAnnouncementSettings(): Promise<AnnouncementSettings> {
  return getStoreSetting(KEY, DEFAULT_ANNOUNCEMENT);
}

export async function setAnnouncementSettings(value: AnnouncementSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
