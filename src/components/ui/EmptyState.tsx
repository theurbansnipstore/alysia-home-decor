import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PackageSearch } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon = PackageSearch, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <Icon size={32} className="mb-4 text-ink-300" aria-hidden />
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
