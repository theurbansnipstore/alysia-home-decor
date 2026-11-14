"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import AddressCard from "@/components/account/AddressCard";
import AddressForm from "@/components/account/AddressForm";
import EmptyState from "@/components/ui/EmptyState";
import { addressContent } from "@/lib/content/checkout";
import type { AddressDTO } from "@/lib/data/addresses";

type Mode = "list" | "add" | { edit: AddressDTO };

export default function AddressManager({ addresses }: { addresses: AddressDTO[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("list");

  function handleSaved() {
    setMode("list");
    router.refresh();
  }

  if (mode === "add" || (typeof mode === "object" && "edit" in mode)) {
    return (
      <AddressForm
        initial={typeof mode === "object" ? mode.edit : undefined}
        onSaved={handleSaved}
        onCancel={() => setMode("list")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <EmptyState
          title={addressContent.emptyTitle}
          description={addressContent.emptyDescription}
          action={
            <Button type="button" variant="primary" onClick={() => setMode("add")}>
              {addressContent.addNewCta}
            </Button>
          }
        />
      ) : (
        <>
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} onEdit={() => setMode({ edit: address })} />
          ))}
          <Button type="button" variant="secondary" onClick={() => setMode("add")}>
            {addressContent.addNewCta}
          </Button>
        </>
      )}
    </div>
  );
}
