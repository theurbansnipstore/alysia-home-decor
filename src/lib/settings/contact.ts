import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_contact";

export interface ContactSettings {
  eyebrow: string;
  /** Blank means "use the auto Contact {store name}" heading the page has
   *  always shown — an unconfigured store's page stays byte-for-byte
   *  identical to before this field existed (Module 43). */
  title: string;
  pageIntro: string;
  email: string;
  phone: string;
  address: string;
  businessHours: string;
  formSubmitLabel: string;
  formSuccessMessage: string;
}

/**
 * email/phone/address/businessHours default to "" — genuinely no such
 * data exists anywhere in this project (checked brand.ts, .env, every
 * config file). Left empty and clearly labeled in the admin form rather
 * than invented; the /contact page only renders a field once it's
 * non-empty. eyebrow/formSubmitLabel/formSuccessMessage default to the
 * exact literal strings the page/form already hardcoded (Module 43) —
 * an unconfigured store looks identical to before these fields existed.
 */
export const DEFAULT_CONTACT: ContactSettings = {
  eyebrow: "Get in touch",
  title: "",
  pageIntro: "Have a question about an order, a product, or something else? Send us a message and we'll get back to you.",
  email: "",
  phone: "",
  address: "",
  businessHours: "",
  formSubmitLabel: "Send Message",
  formSuccessMessage: "Thank you — your message has been received. We'll get back to you as soon as we can.",
};

export async function getContactSettings(): Promise<ContactSettings> {
  return getStoreSetting(KEY, DEFAULT_CONTACT);
}

export async function setContactSettings(value: ContactSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
