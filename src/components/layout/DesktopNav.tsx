import Link from "next/link";
import type { MainNavItem } from "@/lib/config/navigation";

export default function DesktopNav({ items }: { items: MainNavItem[] }) {
  return (
    <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
      {items.map((item) =>
        item.megaMenu ? (
          <div key={item.href} className="group relative">
            <Link href={item.href} className="font-body text-sm tracking-wide text-ink-700 transition-colors hover:text-brass-600">
              {item.label}
            </Link>
            <div className="invisible absolute left-1/2 top-full z-40 w-[640px] -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
              <div className="grid grid-cols-3 gap-8 border border-ink-100 bg-bone-100 p-8 shadow-card">
                {item.megaMenu.map((section) => (
                  <div key={section.heading}>
                    <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brass-600">{section.heading}</p>
                    <ul className="space-y-2">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className="text-sm text-ink-700 hover:text-brass-600">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Link key={item.href} href={item.href} className="font-body text-sm tracking-wide text-ink-700 transition-colors hover:text-brass-600">
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}
