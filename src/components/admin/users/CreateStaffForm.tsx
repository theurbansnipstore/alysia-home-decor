"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import Button from "@/components/ui/Button";

const ASSIGNABLE_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "INVENTORY_STAFF",
  "ORDER_MANAGER",
  "SUPPORT_STAFF",
  "MARKETING_STAFF",
];

export default function CreateStaffForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SUPPORT_STAFF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 border border-ink bg-ink px-5 py-2 text-sm text-bone-100 hover:bg-ink-700"
      >
        New Staff Account
      </button>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't create staff account.");
        return;
      }
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("SUPPORT_STAFF");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-3 border border-ink-100 bg-bone p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs text-ink-500">Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Temporary Password</label>
        <input
          type="text"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-clay sm:col-span-2 lg:col-span-4">{error}</p>}

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          {busy ? "Creating…" : "Create Account"}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-500 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
