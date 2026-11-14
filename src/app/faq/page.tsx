import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";
import Breadcrumb from "@/components/categories/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import FaqAccordion from "@/components/content/FaqAccordion";
import { getFaqSettings } from "@/lib/settings/faq";
import { getBrandSettings } from "@/lib/config/brand";
import { buildFaqJsonLd } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: `FAQ — ${getBrandSettings().name}`,
  description: "Frequently asked questions.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const { items } = await getFaqSettings();
  const visible = items.filter((i) => i.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  // Mirrors exactly the items rendered below — never a superset of the DOM.
  const faqJsonLd = visible.length > 0 ? buildFaqJsonLd(visible.map((i) => ({ question: i.question, answer: i.answer }))) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
      <h1 className="mb-8 font-display text-3xl text-ink sm:text-4xl">Frequently Asked Questions</h1>

      {visible.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No FAQs yet" description="Check back soon, or reach out on our Contact page." />
      ) : (
        <FaqAccordion items={visible} />
      )}
    </div>
  );
}
