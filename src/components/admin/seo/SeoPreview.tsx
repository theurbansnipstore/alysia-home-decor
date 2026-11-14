"use client";

/**
 * Admin SEO preview (Module 31 Part 26) — a visual approximation only.
 * Explicitly labeled as such; never claims to guarantee how Google or a
 * social platform will actually render the page (Part 7/26's explicit
 * instruction).
 */
export default function SeoPreview({ title, description, urlPath }: { title: string; description: string; urlPath: string }) {
  const siteHost = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/+$/, "") || "yourdomain.com";

  return (
    <div className="border border-ink-100 bg-bone-100 p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-ink-400">Google Search Preview</p>
      <div className="max-w-xl">
        <p className="truncate font-sans text-lg text-[#1a0dab]">{title || "(no title)"}</p>
        <p className="text-sm text-[#006621]">
          {siteHost}
          {urlPath}
        </p>
        <p className="line-clamp-2 text-sm text-ink-600">{description || "(no description)"}</p>
      </div>
      <p className="mt-3 text-xs text-ink-400">
        This is a visual approximation only — it does not guarantee how Google (or any search engine) will actually display this page.
      </p>
    </div>
  );
}
