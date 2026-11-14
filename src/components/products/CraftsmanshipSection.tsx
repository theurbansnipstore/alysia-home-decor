import Image from "next/image";
import { getImage } from "@/lib/images/registry";

interface CraftsmanshipSectionProps {
  /** Module 37 — all optional, defaulting to the original static copy. The About page (Module 36) calls this with no props at all, so its rendering is byte-for-byte unchanged; only the product page passes CMS-driven values (src/lib/settings/product-page.ts's craftsmanship field). */
  image?: string;
  imageAlt?: string;
  title?: string;
  body?: string;
}

export default function CraftsmanshipSection({ image, imageAlt, title, body }: CraftsmanshipSectionProps) {
  const defaultImage = getImage("storyCraftsmen");

  return (
    <section className="mt-16 grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
      <div className="relative order-2 aspect-[4/3] overflow-hidden rounded-sm lg:order-1">
        <Image
          src={image || defaultImage.url}
          alt={imageAlt || defaultImage.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      <div className="order-1 lg:order-2">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass-600">Materials &amp; Craftsmanship</p>
        <h2 className="mb-4 font-display text-2xl text-ink">{title || "Made by hand, built to last"}</h2>
        <p className="text-sm leading-relaxed text-ink-500">
          {body ||
            "Every piece in this collection is produced in small batches by independent artisans, using techniques passed through generations. Natural variation in grain, glaze, or weave is part of the character — not a flaw."}
        </p>
      </div>
    </section>
  );
}
