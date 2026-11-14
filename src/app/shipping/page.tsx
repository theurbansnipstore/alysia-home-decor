import type { Metadata } from "next";
import Breadcrumb from "@/components/categories/Breadcrumb";
import { getShippingSettings } from "@/lib/settings/shipping";
import { getBrandSettings } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Shipping — ${getBrandSettings().name}`,
  description: "Shipping information.",
  alternates: { canonical: "/shipping" },
};

export default async function ShippingPage() {
  const { title, sections } = await getShippingSettings();
  const visible = sections.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shipping" }]} />
      <h1 className="mb-8 font-display text-3xl text-ink sm:text-4xl">{title}</h1>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-500">Shipping information isn&apos;t available right now.</p>
      ) : (
        <div className="space-y-8">
          {visible.map((section) => (
            <div key={section.id}>
              <h2 className="mb-2 font-display text-lg text-ink">{section.heading}</h2>
              <p className="text-sm leading-relaxed text-ink-500">{section.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
