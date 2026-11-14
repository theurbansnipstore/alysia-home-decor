import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";
import type { PolicySectionSetting } from "@/lib/settings/shipping";

const KEY = "store_returns";

export interface ReturnsSettings {
  title: string;
  sections: PolicySectionSetting[];
}

/** Seeded from the real, already-live "Returns & Exchanges" copy in src/lib/config/product-badges.ts (including the existing "7-day easy returns" claim) — not invented text. */
export const DEFAULT_RETURNS: ReturnsSettings = {
  title: "Returns & Exchanges",
  sections: [
    {
      id: "returns",
      heading: "Returns & Exchanges",
      body: "7-day easy returns on unused items in original packaging. Handcrafted pieces may show minor natural variation in grain, glaze, or weave — this is expected character, not a defect.",
      enabled: true,
      sortOrder: 0,
    },
  ],
};

export async function getReturnsSettings(): Promise<ReturnsSettings> {
  return getStoreSetting(KEY, DEFAULT_RETURNS);
}

export async function setReturnsSettings(value: ReturnsSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
