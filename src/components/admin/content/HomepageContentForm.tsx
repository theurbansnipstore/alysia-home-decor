"use client";

import { useState, type FormEvent } from "react";
import type {
  HomepageSettings,
  HomepageSectionSetting,
  HeroSlideSetting,
  TrustBadgeItemSetting,
  TestimonialItemSetting,
  InstagramItemSetting,
} from "@/lib/settings/homepage";
import Button from "@/components/ui/Button";
import MediaPickerField from "@/components/admin/content/MediaPickerField";

const SECTION_LABELS: Record<HomepageSectionSetting["id"], string> = {
  hero: "Hero Carousel",
  featuredCategoriesRoom: "Featured Categories — Shop by Room",
  themeShowcase: "Theme Showcase",
  productRailTrending: "Product Rail — Trending",
  storyOurStory: "Story — Our Story",
  productRailBestSellers: "Product Rail — Best Sellers",
  storyCraftsmanship: "Story — Craftsmanship",
  productRailNewArrivals: "Product Rail — New Arrivals",
  featuredCategoriesAll: "Featured Categories — All",
  trustBadges: "Trust Badges",
  testimonials: "Testimonials",
  instagram: "Instagram / Social",
  newsletter: "Newsletter",
};

/** Which optional fields each section type actually supports — no section is forced into fields it doesn't render. */
const SECTION_FIELDS: Record<HomepageSectionSetting["id"], (keyof HomepageSectionSetting)[]> = {
  hero: [],
  featuredCategoriesRoom: ["title", "subtitle"],
  themeShowcase: ["title", "subtitle"],
  productRailTrending: ["title"],
  storyOurStory: ["eyebrow", "title", "body", "image", "ctaText", "ctaLink"],
  productRailBestSellers: ["title"],
  storyCraftsmanship: ["eyebrow", "title", "body", "image", "ctaText", "ctaLink"],
  productRailNewArrivals: ["title"],
  featuredCategoriesAll: ["title", "subtitle"],
  trustBadges: [],
  testimonials: [],
  instagram: ["title", "handle"],
  newsletter: ["title", "description"],
};

const FIELD_LABELS: Partial<Record<keyof HomepageSectionSetting, string>> = {
  title: "Title",
  subtitle: "Subtitle",
  eyebrow: "Eyebrow",
  body: "Body Text",
  image: "Image URL",
  ctaText: "Button Text",
  ctaLink: "Button Link",
  handle: "Instagram Handle",
  description: "Description",
};

const ICON_OPTIONS: TrustBadgeItemSetting["icon"][] = ["Truck", "ShieldCheck", "RotateCcw", "Sparkles"];

function newHeroSlide(sortOrder: number): HeroSlideSetting {
  return { id: `hero-${Date.now()}`, subtitle: "", title: "", image: "", imageAlt: "", ctaText: "Shop now", ctaLink: "/shop", enabled: true, sortOrder };
}
function newTrustBadge(sortOrder: number): TrustBadgeItemSetting {
  return { id: `tb-${Date.now()}`, icon: "Sparkles", label: "", enabled: true, sortOrder };
}
function newTestimonial(sortOrder: number): TestimonialItemSetting {
  return { id: `t-${Date.now()}`, name: "", location: "", quote: "", rating: 5, enabled: true, sortOrder };
}
function newInstagramItem(sortOrder: number): InstagramItemSetting {
  return { id: `ig-${Date.now()}`, image: "", alt: "", link: "#", enabled: true, sortOrder };
}

export default function HomepageContentForm({ initial }: { initial: HomepageSettings }) {
  const [sections, setSections] = useState<HomepageSectionSetting[]>([...initial.sections].sort((a, b) => a.order - b.order));
  const [heroSlides, setHeroSlides] = useState<HeroSlideSetting[]>(initial.heroSlides);
  const [trustBadgeItems, setTrustBadgeItems] = useState<TrustBadgeItemSetting[]>(initial.trustBadgeItems);
  const [testimonialItems, setTestimonialItems] = useState<TestimonialItemSetting[]>(initial.testimonialItems);
  const [instagramItems, setInstagramItems] = useState<InstagramItemSetting[]>(initial.instagramItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<HomepageSectionSetting>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function move(index: number, direction: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Generic array-item helpers, reused for all four item lists below.
  function itemHelpers<T extends { id: string; sortOrder: number }>(
    items: T[],
    setItems: (fn: (prev: T[]) => T[]) => void
  ) {
    return {
      update: (index: number, patch: Partial<T>) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it))),
      remove: (index: number) => setItems((prev) => prev.filter((_, i) => i !== index)),
      move: (index: number, direction: -1 | 1) =>
        setItems((prev) => {
          const next = [...prev];
          const target = index + direction;
          if (target < 0 || target >= next.length) return prev;
          [next[index], next[target]] = [next[target], next[index]];
          return next.map((it, i) => ({ ...it, sortOrder: i }));
        }),
    };
  }

  const heroHelpers = itemHelpers(heroSlides, setHeroSlides);
  const badgeHelpers = itemHelpers(trustBadgeItems, setTrustBadgeItems);
  const testimonialHelpers = itemHelpers(testimonialItems, setTestimonialItems);
  const instagramHelpers = itemHelpers(instagramItems, setInstagramItems);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: sections.map((s, i) => ({ ...s, order: i })),
          heroSlides: heroSlides.map((s, i) => ({ ...s, sortOrder: i })),
          trustBadgeItems: trustBadgeItems.map((b, i) => ({ ...b, sortOrder: i })),
          testimonialItems: testimonialItems.map((t, i) => ({ ...t, sortOrder: i })),
          instagramItems: instagramItems.map((it, i) => ({ ...it, sortOrder: i })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save homepage.");
        return;
      }
      setMessage("Homepage saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      {sections.map((section, index) => {
        const fields = SECTION_FIELDS[section.id];
        return (
          <div key={section.id} className="border border-ink-100 bg-bone p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={section.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
                <span className="font-medium">{SECTION_LABELS[section.id]}</span>
              </label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
                  ↓
                </button>
              </div>
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-ink-300">No editable content for this section — enable/disable and reorder only.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fields.map((fieldKey) => {
                  const isLong = fieldKey === "body" || fieldKey === "description";
                  return (
                    <div key={fieldKey} className={isLong ? "sm:col-span-2" : ""}>
                      <label className="mb-1 block text-xs text-ink-500">{FIELD_LABELS[fieldKey]}</label>
                      {isLong ? (
                        <textarea
                          rows={2}
                          value={(section[fieldKey] as string) ?? ""}
                          onChange={(e) => update(index, { [fieldKey]: e.target.value } as Partial<HomepageSectionSetting>)}
                          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={(section[fieldKey] as string) ?? ""}
                          onChange={(e) => update(index, { [fieldKey]: e.target.value } as Partial<HomepageSectionSetting>)}
                          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t border-ink-100 pt-6">
        <p className="mb-3 font-display text-sm text-ink">Hero Carousel Slides</p>
        <div className="space-y-3">
          {heroSlides.map((slide, index) => (
            <div key={slide.id} className="border border-ink-100 bg-bone-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-ink-500">
                  <input type="checkbox" checked={slide.enabled} onChange={(e) => heroHelpers.update(index, { enabled: e.target.checked })} className="h-4 w-4" />
                  Enabled
                </label>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => heroHelpers.move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => heroHelpers.move(index, 1)} disabled={index === heroSlides.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => heroHelpers.remove(index)} className="text-clay hover:underline">Remove</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input type="text" placeholder="Subtitle" value={slide.subtitle} onChange={(e) => heroHelpers.update(index, { subtitle: e.target.value })} className="border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
                <input type="text" placeholder="Title" value={slide.title} onChange={(e) => heroHelpers.update(index, { title: e.target.value })} className="border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
                <div className="sm:col-span-2">
                  <MediaPickerField label="Image" value={slide.image} onChange={(v) => heroHelpers.update(index, { image: v })} />
                </div>
                <input type="text" placeholder="Image alt text" value={slide.imageAlt} onChange={(e) => heroHelpers.update(index, { imageAlt: e.target.value })} className="sm:col-span-2 border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
                <input type="text" placeholder="Button text" value={slide.ctaText} onChange={(e) => heroHelpers.update(index, { ctaText: e.target.value })} className="border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
                <input type="text" placeholder="Button link" value={slide.ctaLink} onChange={(e) => heroHelpers.update(index, { ctaLink: e.target.value })} className="border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setHeroSlides((prev) => [...prev, newHeroSlide(prev.length)])} className="mt-2 border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
          + Add Slide
        </button>
      </div>

      <div className="border-t border-ink-100 pt-6">
        <p className="mb-3 font-display text-sm text-ink">Trust Badges</p>
        <div className="space-y-3">
          {trustBadgeItems.map((badge, index) => (
            <div key={badge.id} className="flex flex-wrap items-center gap-3 border border-ink-100 bg-bone-100 p-3">
              <input type="checkbox" checked={badge.enabled} onChange={(e) => badgeHelpers.update(index, { enabled: e.target.checked })} className="h-4 w-4" />
              <select value={badge.icon} onChange={(e) => badgeHelpers.update(index, { icon: e.target.value as TrustBadgeItemSetting["icon"] })} className="border border-ink-100 bg-bone px-2 py-2 text-sm focus:border-brass focus:outline-none">
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <input type="text" placeholder="Label" value={badge.label} onChange={(e) => badgeHelpers.update(index, { label: e.target.value })} className="min-w-[200px] flex-1 border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => badgeHelpers.move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => badgeHelpers.move(index, 1)} disabled={index === trustBadgeItems.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => badgeHelpers.remove(index)} className="text-clay hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setTrustBadgeItems((prev) => [...prev, newTrustBadge(prev.length)])} className="mt-2 border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
          + Add Badge
        </button>
      </div>

      <div className="border-t border-ink-100 pt-6">
        <p className="mb-3 font-display text-sm text-ink">Testimonials</p>
        <div className="space-y-3">
          {testimonialItems.map((t, index) => (
            <div key={t.id} className="border border-ink-100 bg-bone-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-ink-500">
                  <input type="checkbox" checked={t.enabled} onChange={(e) => testimonialHelpers.update(index, { enabled: e.target.checked })} className="h-4 w-4" />
                  Enabled
                </label>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => testimonialHelpers.move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => testimonialHelpers.move(index, 1)} disabled={index === testimonialItems.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => testimonialHelpers.remove(index)} className="text-clay hover:underline">Remove</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input type="text" placeholder="Customer name" value={t.name} onChange={(e) => testimonialHelpers.update(index, { name: e.target.value })} className="border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
                <input type="text" placeholder="Location (optional)" value={t.location} onChange={(e) => testimonialHelpers.update(index, { location: e.target.value })} className="border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
                <textarea rows={2} placeholder="Quote" value={t.quote} onChange={(e) => testimonialHelpers.update(index, { quote: e.target.value })} className="sm:col-span-2 border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
                <label className="flex items-center gap-2 text-xs text-ink-500">
                  Rating
                  <select value={t.rating} onChange={(e) => testimonialHelpers.update(index, { rating: Number(e.target.value) })} className="border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setTestimonialItems((prev) => [...prev, newTestimonial(prev.length)])} className="mt-2 border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
          + Add Testimonial
        </button>
      </div>

      <div className="border-t border-ink-100 pt-6">
        <p className="mb-3 font-display text-sm text-ink">Instagram / Social Posts</p>
        <div className="space-y-3">
          {instagramItems.map((item, index) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 border border-ink-100 bg-bone-100 p-3">
              <input type="checkbox" checked={item.enabled} onChange={(e) => instagramHelpers.update(index, { enabled: e.target.checked })} className="h-4 w-4" />
              <div className="min-w-[180px] flex-1">
                <MediaPickerField label="Image" value={item.image} onChange={(v) => instagramHelpers.update(index, { image: v })} />
              </div>
              <input type="text" placeholder="Alt text" value={item.alt} onChange={(e) => instagramHelpers.update(index, { alt: e.target.value })} className="min-w-[140px] flex-1 border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              <input type="text" placeholder="Link" value={item.link} onChange={(e) => instagramHelpers.update(index, { link: e.target.value })} className="min-w-[100px] flex-1 border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => instagramHelpers.move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => instagramHelpers.move(index, 1)} disabled={index === instagramItems.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => instagramHelpers.remove(index)} className="text-clay hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setInstagramItems((prev) => [...prev, newInstagramItem(prev.length)])} className="mt-2 border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
          + Add Post
        </button>
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <div>
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
