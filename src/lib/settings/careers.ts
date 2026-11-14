import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_careers";

export interface CareerListingSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface CareersSettings {
  enabled: boolean;
  title: string;
  description: string;
  listings: CareerListingSetting[];
}

/**
 * Disabled by default per this module's explicit requirement — the
 * business isn't currently using Careers. Copy is deliberately generic
 * boilerplate (no invented team size/history/claims), appropriate for a
 * page that's reachable but not being actively promoted.
 */
export const DEFAULT_CAREERS: CareersSettings = {
  enabled: false,
  title: "Careers at Elysia",
  description: "We're not currently hiring, but we'd love to hear from people who share our values. Check back soon.",
  listings: [],
};

export async function getCareersSettings(): Promise<CareersSettings> {
  return getStoreSetting(KEY, DEFAULT_CAREERS);
}

export async function setCareersSettings(value: CareersSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
