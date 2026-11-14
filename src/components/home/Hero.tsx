// PLACEHOLDER / DRAFT — not part of Module 1-2. Not imported or wired into the app yet. Pending explicit approval of its module before use.
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-bone-100">
      <div className="absolute inset-0 bg-jali bg-[length:80px_80px] opacity-40" aria-hidden />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start px-4 py-24 sm:px-6 lg:px-8 lg:py-36">
        <span className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-brass-400">
          Handcrafted · Regional · Considered
        </span>
        <h1 className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
          Decor that carries the story of where it&apos;s from.
        </h1>
        <p className="mt-6 max-w-md font-body text-base text-ink-100">
          Ten regional collections, one home. Every piece is made by an independent artisan
          and chosen for what it says about a place, not just how it looks on a shelf.
        </p>
        <div className="mt-10 flex gap-4">
          <Link href="/shop"><Button variant="brass" size="lg">Shop the collection</Button></Link>
          <Link href="/themes"><Button variant="secondary" size="lg" className="border-bone-100 text-bone-100 hover:bg-bone-100 hover:text-ink">Explore themes</Button></Link>
        </div>
      </div>
    </section>
  );
}
