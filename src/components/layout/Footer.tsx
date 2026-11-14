import Link from "next/link";
import { Instagram, Facebook, Twitter, Youtube, Globe, type LucideIcon } from "lucide-react";
import Newsletter from "@/components/home/Newsletter";
import { getFooterNav } from "@/lib/config/navigation";
import { getResolvedBrandSettings } from "@/lib/settings/branding";
import { getSocialSettings } from "@/lib/settings/social";
import { getFooterSettings } from "@/lib/settings/footer";

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  twitter: Twitter,
  pinterest: Globe,
  other: Globe,
};

export default async function Footer() {
  const [brand, footerNav, social, footerContent] = await Promise.all([
    getResolvedBrandSettings(),
    getFooterNav(),
    getSocialSettings(),
    getFooterSettings(),
  ]);
  const visibleSocial = social.links.filter((l) => l.enabled && l.url).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <footer className="border-t border-ink-100 bg-ink text-bone">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-16 sm:px-6 md:grid-cols-4 lg:px-8">
        {footerNav.map((column, i) => (
          <div key={column.heading}>
            <h4
              className={
                i === 0
                  ? "mb-4 font-display text-lg"
                  : "mb-4 text-sm uppercase tracking-widest text-brass-400"
              }
            >
              {i === 0 ? brand.name : column.heading}
            </h4>
            <ul className="space-y-2 text-sm text-ink-100">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-brass-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="mb-4 text-sm uppercase tracking-widest text-brass-400">Newsletter</h4>
          <Newsletter variant="compact" />
          {visibleSocial.length > 0 && (
            <div className="mt-6 flex gap-4">
              {visibleSocial.map((link) => {
                const Icon = SOCIAL_ICONS[link.platform] ?? Globe;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={link.label}
                    className="transition-colors hover:text-brass-400"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-ink-500 px-4 py-6 text-center text-xs text-ink-300">
        © {new Date().getFullYear()} {brand.name}. {footerContent.copyrightText || "All rights reserved."}
      </div>
    </footer>
  );
}
