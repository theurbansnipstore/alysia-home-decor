import Link from "next/link";
import Image from "next/image";
import type { CategoryDTO } from "@/types";

interface FeaturedCategoriesProps {
  categories: CategoryDTO[];
  title?: string;
  subtitle?: string;
  limit?: number;
}

export default function FeaturedCategories({
  categories,
  title = "Shop by category",
  subtitle,
  limit = 10,
}: FeaturedCategoriesProps) {
  if (!categories.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        {subtitle && <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{subtitle}</p>}
        <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.slice(0, limit).map((cat) => (
          <Link key={cat.id} href={`/shop?category=${cat.slug}`} className="group block">
            <div className="relative aspect-square overflow-hidden rounded-sm bg-bone-200 shadow-sm transition-shadow duration-300 group-hover:shadow-card">
              {cat.image && (
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              )}
            </div>
            <p className="mt-2 font-body text-sm text-ink-700">{cat.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
