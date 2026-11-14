"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Star } from "lucide-react";
import { addressContent } from "@/lib/content/checkout";
import type { AddressDTO } from "@/lib/data/addresses";

export default function AddressCard({ address, onEdit }: { address: AddressDTO; onEdit: () => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(addressContent.deleteConfirm)) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/account/addresses/${address.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetDefault() {
    setIsSubmitting(true);
    try {
      await fetch(`/api/account/addresses/${address.id}/default`, { method: "POST" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="border border-ink-100 bg-bone-100 p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-body text-sm text-charcoal">
          {address.fullName} {address.label && <span className="text-ink-500">({address.label})</span>}
        </p>
        {address.isDefault && (
          <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-brass-600">
            <Star size={12} fill="currentColor" /> {addressContent.defaultBadge}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-500">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} {address.pincode}
      </p>
      <p className="mt-1 text-sm text-ink-500">{address.phone}</p>

      <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-widest">
        <button type="button" onClick={onEdit} className="flex items-center gap-1 text-ink-700 hover:text-brass-600">
          <Pencil size={12} /> {addressContent.editCta}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className="flex items-center gap-1 text-ink-700 hover:text-clay"
        >
          <Trash2 size={12} /> {addressContent.deleteCta}
        </button>
        {!address.isDefault && (
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={isSubmitting}
            className="text-ink-700 hover:text-brass-600"
          >
            {addressContent.setDefaultCta}
          </button>
        )}
      </div>
    </div>
  );
}
