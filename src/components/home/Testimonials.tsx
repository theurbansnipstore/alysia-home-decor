import { Star } from "lucide-react";
import type { TestimonialDTO } from "@/types";

export default function Testimonials({ testimonials }: { testimonials: TestimonialDTO[] }) {
  if (!testimonials.length) return null;

  return (
    <section className="bg-bone-200/60 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-brass-600">What customers say</p>
          <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">Loved in homes across India</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.id} className="rounded-sm bg-bone-100 p-6 shadow-card">
              <div className="mb-3 flex gap-0.5 text-brass" aria-hidden>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <blockquote className="mb-4 text-sm leading-relaxed text-charcoal">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="text-xs text-ink-500">
                {t.name}
                {t.location && <span> · {t.location}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
