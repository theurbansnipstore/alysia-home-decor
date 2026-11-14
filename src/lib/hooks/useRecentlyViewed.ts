"use client";

import { useEffect } from "react";

const STORAGE_KEY = "kutir_recently_viewed";
const MAX_ITEMS = 8;

/**
 * Records a product slug as "recently viewed" in localStorage on mount.
 * This is the "architecture only" piece requested for Module 6 — a real,
 * working recording mechanism, but with no display UI wired to it yet
 * (see RecentlyViewed.tsx). A future module can read STORAGE_KEY and
 * either keep the local-only approach or move to a server-backed history
 * for logged-in users, without changing how this hook is called.
 */
export function useRecordRecentlyViewed(slug: string) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const existing: string[] = raw ? JSON.parse(raw) : [];
      const next = [slug, ...existing.filter((s) => s !== slug)].slice(0, MAX_ITEMS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable (private browsing, etc.) — non-critical, skip silently.
    }
  }, [slug]);
}
