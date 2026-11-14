"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewsToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reviews/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't update the setting.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 flex items-center justify-between border border-ink-100 bg-bone p-4">
      <div>
        <p className="text-sm text-ink">
          Reviews are currently <span className={enabled ? "text-sage-600" : "text-clay"}>{enabled ? "ON" : "OFF"}</span>
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          {enabled
            ? "Customers can see approved reviews and submit new ones."
            : "The review section is hidden storefront-wide. Existing reviews are kept, not deleted."}
        </p>
        {error && <p className="mt-1 text-xs text-clay">{error}</p>}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="border border-ink bg-ink px-5 py-2 text-sm text-bone-100 hover:bg-ink-700 disabled:opacity-50"
      >
        {busy ? "Saving…" : enabled ? "Turn Off" : "Turn On"}
      </button>
    </div>
  );
}
