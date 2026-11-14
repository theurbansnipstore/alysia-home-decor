"use client";

import { useState, useEffect, useRef, useCallback, type KeyboardEvent, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import type { HeroSlideDTO } from "@/types";

interface HeroCarouselProps {
  slides: HeroSlideDTO[];
  /** Autoplay interval in ms. Defaults to 6s, within the requested 5-6s range. */
  autoPlayMs?: number;
}

export default function HeroCarousel({ slides, autoPlayMs = 6000 }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const prefersReducedMotion = useRef(false);

  // Performance: only the current slide's image is actually needed on first
  // paint. Rendering all N <Image> tags up front (previous behavior) made
  // every slide compete for bandwidth with the LCP image. `mounted` grows
  // monotonically and always includes one slide ahead of `index`, so the
  // upcoming slide's image is already loaded by the time its transition
  // starts — same visual result, far fewer requests on initial load.
  const [mounted, setMounted] = useState<Set<number>>(
    () => new Set(slides.length > 1 ? [0, 1 % slides.length] : [0])
  );

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    setMounted((prev) => {
      const next = new Set(prev);
      next.add(index);
      next.add((index + 1) % slides.length);
      return next;
    });
  }, [index, slides.length]);

  const goTo = useCallback(
    (i: number) => {
      setIndex(((i % slides.length) + slides.length) % slides.length);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Autoplay
  useEffect(() => {
    if (isPaused || slides.length <= 1 || prefersReducedMotion.current) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [isPaused, slides.length, autoPlayMs]);

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  }

  function handleTouchStart(e: TouchEvent<HTMLElement>) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: TouchEvent<HTMLElement>) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) prev();
      else next();
    }
    touchStartX.current = null;
  }

  if (slides.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden bg-ink text-bone-100"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 bg-jali bg-[length:80px_80px] opacity-30" aria-hidden />

      <div className="relative h-[560px] sm:h-[600px] lg:h-[680px]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              i === index ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
            }`}
          >
            {mounted.has(i) && (
              <Image
                src={slide.image}
                alt={slide.imageAlt}
                fill
                priority={i === 0}
                className="object-cover"
                sizes="100vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-ink/10" />

            <div className="relative mx-auto flex h-full max-w-7xl flex-col items-start justify-end px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
              {slide.subtitle && (
                <span className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-brass-400">
                  {slide.subtitle}
                </span>
              )}
              <h1 className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href={slide.ctaLink}>
                  <Button variant="brass" size="lg">
                    {slide.ctaText}
                  </Button>
                </Link>
                {slide.secondaryCtaText && slide.secondaryCtaLink && (
                  <Link href={slide.secondaryCtaLink}>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="border-bone-100 text-bone-100 hover:bg-bone-100 hover:text-ink"
                    >
                      {slide.secondaryCtaText}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-bone-100/30 bg-ink/40 p-2 text-bone-100 backdrop-blur-sm transition hover:bg-ink/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass sm:left-6"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-bone-100/30 bg-ink/40 p-2 text-bone-100 backdrop-blur-sm transition hover:bg-ink/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass sm:right-6"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2" aria-label="Slide navigation">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-brass" : "w-1.5 bg-bone-100/50 hover:bg-bone-100/80"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Announces slide changes to screen reader users without duplicating visible content */}
      <div className="sr-only" aria-live="polite">
        Slide {index + 1} of {slides.length}: {slides[index].title}
      </div>
    </section>
  );
}
