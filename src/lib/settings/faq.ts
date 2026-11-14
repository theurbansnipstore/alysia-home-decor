import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_faq";

export interface FaqItemSetting {
  id: string;
  question: string;
  answer: string;
  category: string;
  enabled: boolean;
  sortOrder: number;
}

export interface FaqSettings {
  items: FaqItemSetting[];
}

/** No FAQ content exists anywhere in the project — starts empty rather than inventing questions/answers. */
export const DEFAULT_FAQ: FaqSettings = { items: [] };

export async function getFaqSettings(): Promise<FaqSettings> {
  return getStoreSetting(KEY, DEFAULT_FAQ);
}

export async function setFaqSettings(value: FaqSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
