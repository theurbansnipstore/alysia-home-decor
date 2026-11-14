import type { Metadata } from "next";
import Breadcrumb from "@/components/categories/Breadcrumb";
import { getCareersSettings } from "@/lib/settings/careers";
import { getBrandSettings } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Careers — ${getBrandSettings().name}`,
  description: "Careers.",
  alternates: { canonical: "/careers" },
};

/**
 * Always reachable at this URL, even when `enabled` is false — hidden
 * from nav/footer, never 404. When disabled, shows a sensible "not
 * currently hiring" state rather than a broken page.
 */
export default async function CareersPage() {
  const { enabled, title, description, listings } = await getCareersSettings();
  const visibleListings = listings.filter((l) => l.enabled);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Careers" }]} />
      <h1 className="mb-4 font-display text-3xl text-ink sm:text-4xl">{title}</h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-500">{description}</p>

      {enabled && visibleListings.length > 0 && (
        <div className="space-y-6">
          {visibleListings.map((listing) => (
            <div key={listing.id} className="border border-ink-100 bg-bone p-5">
              <h2 className="mb-2 font-display text-lg text-ink">{listing.title}</h2>
              <p className="text-sm leading-relaxed text-ink-500">{listing.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
