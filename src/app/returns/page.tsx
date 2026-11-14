import type { Metadata } from "next";
import Breadcrumb from "@/components/categories/Breadcrumb";
import { getReturnsSettings } from "@/lib/settings/returns";
import { getBrandSettings } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Returns — ${getBrandSettings().name}`,
  description: "Return and exchange policy.",
  alternates: { canonical: "/returns" },
};

export default async function ReturnsPage() {
  const { title, sections } = await getReturnsSettings();
  const visible = sections.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Returns" }]} />
      <h1 className="mb-8 font-display text-3xl text-ink sm:text-4xl">{title}</h1>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-500">Return policy information isn&apos;t available right now.</p>
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
