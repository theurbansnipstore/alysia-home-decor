import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_about";

export interface AboutSettings {
  introEyebrow: string;
  introHeading: string;
  introBody: string;
  approachBody: string;
  collectionsHeading: string;
  collectionsBody: string;
  qualityHeading: string;
  qualityBody: string;
}

/** Matches the real copy currently hardcoded in src/app/about/page.tsx exactly. */
export const DEFAULT_ABOUT: AboutSettings = {
  introEyebrow: "About Elysia",
  introHeading: "The story behind Elysia",
  introBody:
    "Elysia began as a small effort to connect independent artisans across India with homes that value what's made by hand. We believe good home decor should feel personal — carrying the mark of the hands that made it, not the sameness of mass production.",
  approachBody:
    "Every piece we offer is chosen for the story behind it as much as how it looks in a room — hand-thrown pottery, hand-loomed textiles, and small-batch metalwork, produced by independent craftspeople rather than mass-manufactured.",
  collectionsHeading: "Design rooted in India's regions",
  collectionsBody:
    "Alongside shopping by room, our themed collections draw on regional and cultural craft traditions from across India — from Bengali and Rajasthani to South Indian and Punjabi styles — so you can style a space around an aesthetic that feels meaningful to you.",
  qualityHeading: "What you can expect from us",
  qualityBody:
    "We check every product before it's listed, describe materials and dimensions honestly, and stand behind what we sell. If something isn't right, our team is here to help.",
};

export async function getAboutSettings(): Promise<AboutSettings> {
  return getStoreSetting(KEY, DEFAULT_ABOUT);
}

export async function setAboutSettings(value: AboutSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
