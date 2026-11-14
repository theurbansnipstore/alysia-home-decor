"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import type { AdminStaffListItem } from "@/lib/data/admin-users";

const ASSIGNABLE_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "INVENTORY_STAFF",
  "ORDER_MANAGER",
  "SUPPORT_STAFF",
  "MARKETING_STAFF",
];

export default function StaffTable({ staff, currentUserId }: { staff: AdminStaffListItem[]; currentUserId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(id: string, role: Role) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't update role.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleBlocked(id: string, isBlocked: boolean) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't update status.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(id: string) {
    const newPassword = window.prompt("Enter a new temporary password (min 8 characters) for this staff member:");
    if (!newPassword) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't reset password.");
        return;
      }
      window.alert("Password reset. Share the new password with this staff member securely, out of band.");
    } finally {
      setBusyId(null);
    }
  }

  if (staff.length === 0) {
    return <p className="border border-ink-100 bg-bone p-8 text-center text-sm text-ink-500">No staff accounts yet.</p>;
  }

  return (
    <div>
      {error && <p className="mb-3 text-xs text-clay">{error}</p>}
      <div className="overflow-x-auto border border-ink-100 bg-bone">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-ink">
                  {s.name}
                  {s.id === currentUserId && <span className="ml-2 text-[10px] uppercase text-brass-600">You</span>}
                </td>
                <td className="px-4 py-3 text-ink-500">{s.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={s.role}
                    disabled={busyId === s.id}
                    onChange={(e) => handleRoleChange(s.id, e.target.value as Role)}
                    className="border border-ink-100 bg-bone px-2 py-1 text-xs focus:border-brass focus:outline-none"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs ${s.isBlocked ? "bg-clay/10 text-clay" : "bg-green-100 text-green-800"}`}>
                    {s.isBlocked ? "Deactivated" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(s.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => handleToggleBlocked(s.id, !s.isBlocked)}
                      className="text-brass-600 hover:underline disabled:opacity-50"
                    >
                      {s.isBlocked ? "Activate" : "Deactivate"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => handleResetPassword(s.id)}
                      className="text-ink-700 hover:underline disabled:opacity-50"
                    >
                      Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
