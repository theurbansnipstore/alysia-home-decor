"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImageSet } from "@/types";

export default function ProductGallery({ images, productName }: { images: ProductImageSet; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const active = images.gallery[activeIndex] ?? images.primary;

  const close = useCallback(() => setZoomOpen(false), []);

  useEffect(() => {
    if (!zoomOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setActiveIndex((i) => (i + 1) % images.gallery.length);
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i - 1 + images.gallery.length) % images.gallery.length);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [zoomOpen, close, images.gallery.length]);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-sm bg-bone-200 shadow-sm">
        <Image
          key={active.id}
          src={active.url}
          alt={active.altText || productName}
          fill
          priority
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="View full-size image"
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-bone-100/90 text-ink shadow-sm transition-colors hover:bg-bone-100"
        >
          <ZoomIn size={18} />
        </button>
      </div>

      {images.gallery.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.gallery.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1} of ${images.gallery.length}`}
              aria-current={i === activeIndex}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border transition-colors ${
                i === activeIndex ? "border-brass" : "border-ink-100 hover:border-brass-400"
              }`}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}

      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} — full-size image`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close full-size image"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-bone-100/90 text-ink"
          >
            <X size={20} />
          </button>

          {images.gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveIndex((i) => (i - 1 + images.gallery.length) % images.gallery.length)}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bone-100/90 text-ink"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((i) => (i + 1) % images.gallery.length)}
                aria-label="Next image"
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bone-100/90 text-ink"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="relative h-full max-h-[85vh] w-full max-w-4xl">
            <Image
              src={images.zoom.url}
              alt={active.altText || productName}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      )}
    </div>
  );
}
