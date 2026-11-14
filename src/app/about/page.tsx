import type { Metadata } from "next";
import Link from "next/link";
import StorySection from "@/components/home/StorySection";
import CraftsmanshipSection from "@/components/products/CraftsmanshipSection";
import Breadcrumb from "@/components/categories/Breadcrumb";
import Button from "@/components/ui/Button";
import { getImage } from "@/lib/images/registry";
import { getBrandSettings } from "@/lib/config/brand";
import { getAboutSettings } from "@/lib/settings/about";

export const metadata: Metadata = {
  title: `About — ${getBrandSettings().name}`,
  description: "Our story, craftsmanship, and design philosophy.",
  alternates: { canonical: "/about" },
};

/**
 * Module 36: now reads from getAboutSettings() (Setting-backed, admin-
 * editable at /admin/content/about) instead of the copy that used to be
 * hardcoded here — the admin form already existed and saved correctly, it
 * just had no reader. DEFAULT_ABOUT matches this page's exact former copy,
 * so an unconfigured store still renders identically to before.
 */
export default async function AboutPage() {
  const brand = getBrandSettings();
  const about = await getAboutSettings();
  const ourCraft = getImage("storyOurCraft");

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />
        <div className="mt-4 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{about.introEyebrow}</p>
          <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">{about.introHeading}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-500">{about.introBody}</p>
        </div>
      </div>

      <StorySection
        eyebrow="Our approach"
        title="Rooted in craft, made for modern homes"
        body={about.approachBody}
        image={ourCraft.url}
        imageAlt={ourCraft.alt}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CraftsmanshipSection />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass-600">Cultural collections</p>
        <h2 className="mb-4 font-display text-2xl text-ink">{about.collectionsHeading}</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-500">{about.collectionsBody}</p>
        <Link href="/collections" className="mt-6 inline-block">
          <Button variant="secondary">Explore Collections</Button>
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass-600">Quality &amp; care</p>
        <h2 className="mb-4 font-display text-2xl text-ink">{about.qualityHeading}</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-500">
          {about.qualityBody}{" "}
          <Link href="/contact" className="text-brass-600 hover:underline">
            Contact
          </Link>{" "}
          page to reach us.
        </p>
      </section>
    </div>
  );
}
