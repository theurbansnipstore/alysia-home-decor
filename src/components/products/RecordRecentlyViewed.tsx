"use client";

import { useRecordRecentlyViewed } from "@/lib/hooks/useRecentlyViewed";

export default function RecordRecentlyViewed({ slug }: { slug: string }) {
  useRecordRecentlyViewed(slug);
  return null;
}
