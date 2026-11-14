"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { ProductStatus } from "@prisma/client";

export default function ArchiveButton({ productId, status }: { productId: string; status: ProductStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isArchived = status === "ARCHIVED";

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/admin/products/${productId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isArchived ? "restore" : "archive" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant={isArchived ? "secondary" : "ghost"} size="sm" disabled={busy} onClick={toggle}>
      {busy ? "Working…" : isArchived ? "Restore to Draft" : "Archive Product"}
    </Button>
  );
}
