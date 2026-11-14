import type { Metadata } from "next";
import Image from "next/image";
import { getAllThemes } from "@/lib/data/themes";
import CollectionCard from "@/components/categories/CollectionCard";
import Breadcrumb from "@/components/categories/Breadcrumb";
import { getBrandSettings } from "@/lib/config/brand";
import { getBrowsePagesSettings } from "@/lib/settings/browse-pages";

export async function generateMetadata(): Promise<Metadata> {
  const { themes } = await getBrowsePagesSettings();
  const brand = getBrandSettings();
  return {
    title: `${themes.seoTitle || "Themes"} — ${brand.name}`,
    description: themes.seoDesc || `Explore ${brand.name}'s regional and cultural home decor collections, from Bengali to Rajasthani craft.`,
    alternates: { canonical: "/themes" },
  };
}

export default async function ThemesPage() {
  const [themes, { themes: content }] = await Promise.all([getAllThemes(), getBrowsePagesSettings()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Themes" }]} />

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

      {themes.length === 0 ? (
        <p className="text-sm text-ink-500">No themes available right now.</p>
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
    </div>
  );
}
