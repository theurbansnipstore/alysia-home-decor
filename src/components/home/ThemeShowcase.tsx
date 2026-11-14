import Link from "next/link";
import Image from "next/image";
import type { ThemeDTO } from "@/types";

interface ThemeShowcaseProps {
  themes: ThemeDTO[];
  subtitle?: string;
  title?: string;
}

export default function ThemeShowcase({ themes, subtitle = "Trending Collections", title = "Shop by tradition" }: ThemeShowcaseProps) {
  if (!themes.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{subtitle}</p>
        <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {themes.slice(0, 6).map((theme) => (
          <Link
            key={theme.id}
            href={`/shop?theme=${theme.slug}`}
            className="group relative block overflow-hidden rounded-sm shadow-sm transition-shadow duration-300 hover:shadow-card"
          >
            <div className="relative aspect-[4/3]">
              {theme.banner && (
                <Image
                  src={theme.banner}
                  alt={theme.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
              <p className="absolute bottom-4 left-4 font-display text-xl text-bone-100">{theme.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
