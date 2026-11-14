import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface StorySectionProps {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  ctaText?: string;
  ctaLink?: string;
  /** Swaps the image to the right column on desktop instead of the left. */
  reverse?: boolean;
}

export default function StorySection({
  eyebrow,
  title,
  body,
  image,
  imageAlt,
  ctaText,
  ctaLink,
  reverse,
}: StorySectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={`relative aspect-[4/3] overflow-hidden rounded-sm ${reverse ? "lg:order-2" : ""}`}>
          <Image src={image} alt={imageAlt} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
        </div>
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass-600">{eyebrow}</p>
          <h2 className="mb-4 font-display text-3xl text-ink">{title}</h2>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-ink-500">{body}</p>
          {ctaText && ctaLink && (
            <Link href={ctaLink}>
              <Button variant="secondary">{ctaText}</Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
