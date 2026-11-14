import type { Metadata } from "next";
import Image from "next/image";
import { getAllCategories } from "@/lib/data/categories";
import { getAllThemes } from "@/lib/data/themes";
import CollectionCard from "@/components/categories/CollectionCard";
import Breadcrumb from "@/components/categories/Breadcrumb";
import { getBrandSettings } from "@/lib/config/brand";
import { getBrowsePagesSettings } from "@/lib/settings/browse-pages";

export async function generateMetadata(): Promise<Metadata> {
  const { collections } = await getBrowsePagesSettings();
  const brand = getBrandSettings();
  return {
    title: `${collections.seoTitle || "Collections & Inspiration"} — ${brand.name}`,
    description: collections.seoDesc || "Shop by room, or explore collections inspired by India's regional craft traditions.",
    alternates: { canonical: "/collections" },
  };
}

/**
 * Reuses the real Category/Theme data (and CollectionCard, the same
 * component /categories and /themes already use) rather than inventing a
 * new content system or any collections that don't exist in the database
 * (Module 36 decision, preserved). Module 37: page chrome (eyebrow/title/
 * description/section headings) is now admin-editable via
 * src/lib/settings/browse-pages.ts — the grid contents themselves remain
 * fully commerce-authoritative and untouched.
 */
export default async function CollectionsPage() {
  const [categories, themes, { collections: content, collectionsRoomHeading, collectionsStyleHeading }] = await Promise.all([
    getAllCategories(),
    getAllThemes(),
    getBrowsePagesSettings(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Collections" }]} />

      {content.heroImage && (
        <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-sm">
          <Image src={content.heroImage} alt={content.title} fill className="object-cover" sizes="100vw" priority />
        </div>
      )}

      <div className="mb-10">
        {content.eyebrow && <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{content.eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">{content.title}</h1>
        {content.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500">{content.description}</p>}
      </div>

      <section className="mb-14">
        <h2 className="mb-6 font-display text-xl text-ink">{collectionsRoomHeading}</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-ink-500">No categories available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <CollectionCard
                key={cat.id}
                name={cat.name}
                href={`/categories/${cat.slug}`}
                image={cat.image}
                description={cat.description}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-6 font-display text-xl text-ink">{collectionsStyleHeading}</h2>
        {themes.length === 0 ? (
          <p className="text-sm text-ink-500">No collections available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <CollectionCard
                key={theme.id}
                name={theme.name}
                href={`/themes/${theme.slug}`}
                image={theme.banner}
                description={theme.description}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
