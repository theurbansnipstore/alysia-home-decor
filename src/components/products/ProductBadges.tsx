import { Hammer, Sparkles, Leaf, type LucideIcon } from "lucide-react";
import type { ProductBadgeSetting } from "@/lib/settings/product-page";

/** Icon stays code-controlled, keyed by the fixed badge id — matches the fixed 3-item set src/lib/settings/product-page.ts defines (Part 5: preserve the existing visual design). */
const ICONS: Record<ProductBadgeSetting["id"], LucideIcon> = {
  handcrafted: Hammer,
  artisanMade: Sparkles,
  sustainablySourced: Leaf,
};

export default function ProductBadges({ badges }: { badges: ProductBadgeSetting[] }) {
  const visible = badges.filter((b) => b.enabled);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {visible.map((badge) => {
        const Icon = ICONS[badge.id] ?? Sparkles;
        return (
          <span key={badge.id} className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-sage-600" title={badge.description || undefined}>
            <Icon size={14} aria-hidden /> {badge.title}
          </span>
        );
      })}
    </div>
  );
}
