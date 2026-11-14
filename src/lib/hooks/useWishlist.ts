"use client";

import { useEffect, useState } from "react";

/**
 * Shared client-side wishlist state, used by both WishlistButton and
 * ProductCard so they read the same source of truth and never duplicate
 * fetch/add/remove logic. A module-level cache (not React Context) keeps
 * this simple: every mounted component that asks "is this wishlisted?"
 * shares one fetch of /api/wishlist and one in-memory Set, and toggling
 * on any one of them instantly updates every other mounted component too.
 */

let cachedIds: Set<string> | null = null;
let inFlight: Promise<Set<string>> | null = null;
const listeners = new Set<(ids: Set<string>) => void>();

async function fetchWishlistIds(): Promise<Set<string>> {
  try {
    const res = await fetch("/api/wishlist");
    const json = await res.json();
    if (!json.success) return new Set();
    return new Set<string>(json.data.items.map((item: { productId: string }) => item.productId));
  } catch {
    return new Set();
  }
}

function loadWishlistIds(): Promise<Set<string>> {
  if (cachedIds) return Promise.resolve(cachedIds);
  if (!inFlight) {
    inFlight = fetchWishlistIds().then((ids) => {
      cachedIds = ids;
      inFlight = null;
      return ids;
    });
  }
  return inFlight;
}

function setWishlistedLocally(productId: string, wishlisted: boolean) {
  const next = new Set(cachedIds ?? []);
  if (wishlisted) next.add(productId);
  else next.delete(productId);
  cachedIds = next;
  listeners.forEach((listener) => listener(next));
}

/** True/false once resolved; starts false until the shared fetch resolves. */
export function useIsWishlisted(productId: string): boolean {
  const [ids, setIds] = useState<Set<string>>(() => cachedIds ?? new Set());

  useEffect(() => {
    let mounted = true;
    loadWishlistIds().then((loaded) => {
      if (mounted) setIds(new Set(loaded));
    });

    const listener = (updated: Set<string>) => {
      if (mounted) setIds(new Set(updated));
    };
    listeners.add(listener);

    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  return ids.has(productId);
}

export interface WishlistActionResult {
  success: boolean;
  error?: string;
}

export async function addWishlistItem(productId: string): Promise<WishlistActionResult> {
  try {
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || "Couldn't add this to your wishlist." };
    }
    setWishlistedLocally(productId, true);
    return { success: true };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

export async function removeWishlistItem(productId: string): Promise<WishlistActionResult> {
  try {
    const res = await fetch(`/api/wishlist/items/${productId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || "Couldn't remove this from your wishlist." };
    }
    setWishlistedLocally(productId, false);
    return { success: true };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}
