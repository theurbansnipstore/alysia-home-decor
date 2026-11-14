"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import Button from "@/components/ui/Button";

interface LogoutButtonProps {
  /** Compact icon-only rendering for tight header space — same logout call, different presentation. */
  iconOnly?: boolean;
}

export default function LogoutButton({ iconOnly = false }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="Sign out"
        title="Sign out"
        className="p-1 text-ink-700 transition-colors hover:text-brass-600 disabled:opacity-50"
      >
        <LogOut size={18} aria-hidden />
      </button>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
