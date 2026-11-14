import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_footer";

export interface FooterLinkSetting {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
}

export interface FooterColumnSetting {
  id: string;
  heading: string;
  sortOrder: number;
  links: FooterLinkSetting[];
}

export interface FooterSettings {
  description: string;
  columns: FooterColumnSetting[];
  copyrightText: string;
}

/** Matches today's hardcoded footerNav (src/lib/config/navigation.ts) exactly. */
export const DEFAULT_FOOTER: FooterSettings = {
  description: "",
  copyrightText: "All rights reserved.",
  columns: [
    {
      id: "company",
      heading: "Company",
      sortOrder: 0,
      links: [
        { id: "about", label: "About", href: "/about", enabled: true, sortOrder: 0 },
        { id: "contact", label: "Contact", href: "/contact", enabled: true, sortOrder: 1 },
        { id: "careers", label: "Careers", href: "/careers", enabled: false, sortOrder: 2 },
      ],
    },
    {
      id: "support",
      heading: "Support",
      sortOrder: 1,
      links: [
        { id: "faq", label: "FAQ", href: "/faq", enabled: true, sortOrder: 0 },
        { id: "shipping", label: "Shipping", href: "/shipping", enabled: true, sortOrder: 1 },
        { id: "returns", label: "Return Policy", href: "/returns", enabled: true, sortOrder: 2 },
      ],
    },
    {
      id: "explore",
      heading: "Explore",
      sortOrder: 2,
      links: [
        { id: "categories", label: "Categories", href: "/categories", enabled: true, sortOrder: 0 },
        { id: "themes", label: "Themes", href: "/themes", enabled: true, sortOrder: 1 },
        { id: "collections", label: "Collections", href: "/collections", enabled: true, sortOrder: 2 },
      ],
    },
  ],
};

export async function getFooterSettings(): Promise<FooterSettings> {
  return getStoreSetting(KEY, DEFAULT_FOOTER);
}

export async function setFooterSettings(value: FooterSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
