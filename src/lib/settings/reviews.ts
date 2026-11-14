import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Smallest possible use of the existing (previously unused) Setting model —
 * one row, keyed "reviews_enabled", value a raw JSON boolean. No row yet =
 * treated as enabled (reviews are a MUST HAVE by default, not opt-in).
 */
const SETTING_KEY = "reviews_enabled";

/** cache()'d — ProductCard checks this per card; memoizing keeps that at one query per request, not one per card. */
export const getReviewsEnabled = cache(async (): Promise<boolean> => {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!setting) return true;
  return setting.value === true;
});

export async function setReviewsEnabled(enabled: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: enabled },
    create: { key: SETTING_KEY, value: enabled },
  });
}
