import Link from "next/link";
import { User } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import type { SessionUser } from "@/types/auth";

interface UserMenuProps {
  session: SessionUser | null;
  /** Icon-only sign-out for the mobile header row, where a full "Sign out" button doesn't fit. */
  compactLogout?: boolean;
}

/** The Admin shortcut used to live here — it now lives in Header.tsx's
 *  left-side cluster on desktop (with the logo/nav), and inside the mobile
 *  drawer (MobileNavToggle) on mobile — visually separated from the
 *  ordinary customer actions (cart/account) this menu still owns. */
export default function UserMenu({ session, compactLogout = false }: UserMenuProps) {
  if (!session) {
    return (
      <Link href="/login" aria-label="Sign in" className="text-ink-700 transition-colors hover:text-brass-600">
        <User size={19} />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/account" className="hidden text-sm text-ink-700 hover:text-brass-600 sm:inline">
        {session.name.split(" ")[0]}
      </Link>
      <Link href="/account" aria-label="My account" className="text-ink-700 hover:text-brass-600 sm:hidden">
        <User size={19} />
      </Link>
      <LogoutButton iconOnly={compactLogout} />
    </div>
  );
}
