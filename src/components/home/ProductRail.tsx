import Link from "next/link";
import ProductCard from "@/components/ui/ProductCard";
import type { ProductCardDTO } from "@/types";

export default function ProductRail({
  title,
  subtitle,
  href,
  products,
}: {
  title: string;
  subtitle?: string;
  href: string;
  products: ProductCardDTO[];
}) {
  if (!products.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        <Link href={href} className="font-mono text-xs uppercase tracking-widest text-brass-600 hover:text-brass">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
