import type { Metadata } from "next";
import { Instagram, Facebook, Twitter, Youtube, Globe, type LucideIcon } from "lucide-react";
import Breadcrumb from "@/components/categories/Breadcrumb";
import ContactForm from "@/components/contact/ContactForm";
import { getBrandSettings } from "@/lib/config/brand";
import { getContactSettings } from "@/lib/settings/contact";
import { getSocialSettings } from "@/lib/settings/social";

// Same icon map as Footer.tsx — reused, not duplicated as a new concept;
// Contact simply also renders the store's existing social links (Module 43),
// it doesn't introduce a second social-links system.
const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  twitter: Twitter,
  pinterest: Globe,
  other: Globe,
};

export const metadata: Metadata = {
  title: `Contact — ${getBrandSettings().name}`,
  description: "Get in touch with us about an order, a product, or anything else.",
  alternates: { canonical: "/contact" },
};

const CONTACT_DETAILS: { key: "email" | "phone" | "address" | "businessHours"; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "businessHours", label: "Business Hours" },
];

/**
 * Module 36: now reads from getContactSettings() (admin-editable at
 * /admin/content/contact) instead of the hardcoded intro that used to be
 * here — the admin form already existed and saved correctly, it just had
 * no reader. Each detail field only renders once it's actually non-empty,
 * matching this settings module's original intent (no invented contact
 * info for fields an admin hasn't filled in).
 *
 * Module 43: eyebrow/title/form-submit-label/form-success-message were the
 * remaining hardcoded editorial strings on this page (the exact ones the
 * user pointed at — "Get in touch" and "Contact Elysia") — now sourced
 * from the same ContactSettings, with the historical literal values as
 * defaults so an unconfigured store renders byte-for-byte the same as
 * before. Title blank => the original "Contact {brand.name}" behavior,
 * never a blank heading. Also now shows the store's existing social links
 * (Footer.tsx's own store_social Setting, unchanged) when any are enabled —
 * reusing, not duplicating, that system.
 */
export default async function ContactPage() {
  const brand = getBrandSettings();
  const [contact, social] = await Promise.all([getContactSettings(), getSocialSettings()]);
  const details = CONTACT_DETAILS.filter((d) => contact[d.key].trim());
  const visibleSocial = social.links.filter((l) => l.enabled && l.url).sort((a, b) => a.sortOrder - b.sortOrder);
  const title = contact.title.trim() || `Contact ${brand.name}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <div className="mb-8">
        {contact.eyebrow.trim() && <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{contact.eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-500">{contact.pageIntro}</p>
      </div>

      {details.length > 0 && (
        <dl className="mb-8 grid grid-cols-1 gap-4 border border-ink-100 bg-bone p-6 sm:grid-cols-2">
          {details.map((d) => (
            <div key={d.key}>
              <dt className="text-xs uppercase tracking-wide text-ink-500">{d.label}</dt>
              <dd className="mt-1 text-sm text-ink">{contact[d.key]}</dd>
            </div>
          ))}
        </dl>
      )}

      {visibleSocial.length > 0 && (
        <div className="mb-8 flex items-center gap-4">
          {visibleSocial.map((link) => {
            const Icon = SOCIAL_ICONS[link.platform] ?? Globe;
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={link.label}
                className="text-ink-500 transition-colors hover:text-brass-600"
              >
                <Icon size={20} />
              </a>
            );
          })}
        </div>
      )}

      <ContactForm submitLabel={contact.formSubmitLabel.trim() || undefined} successMessage={contact.formSuccessMessage.trim() || undefined} />
    </div>
  );
}
