import Link from "next/link";
import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

const CONTENT_LINKS = [
  { href: "/admin/content/pages", label: "Pages", description: "Custom editorial pages — create, publish, and manage" },
  { href: "/admin/content/browse-pages", label: "Categories / Themes / Collections", description: "Page titles, descriptions, hero images, SEO" },
  { href: "/admin/content/announcement", label: "Announcement Bar", description: "The banner shown at the top of every page" },
  { href: "/admin/content/homepage", label: "Homepage", description: "Enable/disable sections, order, titles, CTAs" },
  { href: "/admin/content/navigation", label: "Header Navigation", description: "Main menu items" },
  { href: "/admin/content/footer", label: "Footer", description: "Footer columns, links, description, copyright" },
  { href: "/admin/content/social", label: "Social Media", description: "Instagram, Facebook, YouTube, Pinterest, X" },
  { href: "/admin/content/about", label: "About Page", description: "Story, approach, collections, quality copy" },
  { href: "/admin/content/contact", label: "Contact Page", description: "Email, phone, address, hours, intro text" },
  { href: "/admin/content/faq", label: "FAQ", description: "Questions and answers" },
  { href: "/admin/content/shipping", label: "Shipping Policy", description: "Shipping page content" },
  { href: "/admin/content/returns", label: "Returns Policy", description: "Returns page content" },
  { href: "/admin/content/careers", label: "Careers", description: "Hidden by default — enable when ready" },
  { href: "/admin/content/media", label: "Media", description: "Named image URLs for reuse across settings" },
];

export default async function AdminContentPage() {
  await requireRole(CONTENT_AREA_ROLES);

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl text-ink">Store Content</h1>
      <p className="mb-6 text-sm text-ink-500">Control what appears on the storefront without editing code.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="block border border-ink-100 bg-bone p-4 transition-colors hover:border-brass">
            <p className="font-display text-base text-ink">{link.label}</p>
            <p className="mt-1 text-xs text-ink-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
