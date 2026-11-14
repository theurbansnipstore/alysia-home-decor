"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the native share sheet — no error state needed.
      }
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-2 text-sm text-ink-500 transition-colors hover:text-brass-600"
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
