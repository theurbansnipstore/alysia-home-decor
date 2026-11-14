import { Truck, ShieldCheck, RotateCcw, Sparkles, type LucideIcon } from "lucide-react";
import type { TrustBadgeDTO } from "@/types";

const ICONS: Record<string, LucideIcon> = { Truck, ShieldCheck, RotateCcw, Sparkles };

export default function TrustBadges({ badges }: { badges: TrustBadgeDTO[] }) {
  if (!badges.length) return null;

  return (
    <section className="border-y border-ink-100 bg-bone-100">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        {badges.map((badge) => {
          const Icon = ICONS[badge.icon] ?? Sparkles;
          return (
            <div key={badge.id} className="flex flex-col items-center gap-2 text-center">
              <Icon size={22} className="text-brass" aria-hidden />
              <p className="text-xs text-ink-700">{badge.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
