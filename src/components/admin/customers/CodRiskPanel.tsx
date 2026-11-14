"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { CodRiskSummary } from "@/lib/data/admin-customers";

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export default function CodRiskPanel({
  customerId,
  codRisk,
  canOverride,
}: {
  customerId: string;
  codRisk: CodRiskSummary;
  canOverride: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(blocked: boolean) {
    if (!note.trim()) {
      setError("Please add a short note explaining this change.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/cod-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked, note: note.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't update COD status.");
        return;
      }
      setShowForm(false);
      setNote("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-3 font-display text-base text-ink">COD / Order Risk</h2>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">COD Status</p>
          <p className={`mt-1 font-medium ${codRisk.codBlocked ? "text-clay" : "text-sage-600"}`}>
            {codRisk.codBlocked ? "Restricted" : "Enabled"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Payment Options</p>
          <p className="mt-1 text-ink-700">{codRisk.codBlocked ? "Online payment only" : "COD and online payment"}</p>
        </div>
        {codRisk.codBlocked && (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-500">Reason</p>
              <p className="mt-1 text-ink-700">{codRisk.codBlockedReason ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-500">Restricted Since</p>
              <p className="mt-1 text-ink-700">
                {formatDate(codRisk.codBlockedAt)} {codRisk.codBlockedBy && `(${codRisk.codBlockedBy})`}
              </p>
            </div>
          </>
        )}
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">
            Qualifying Incidents (last {codRisk.qualifyingIncidentCountWindowDays} days)
          </p>
          <p className="mt-1 text-ink-700">{codRisk.qualifyingIncidentCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Last Incident</p>
          <p className="mt-1 text-ink-700">{formatDate(codRisk.lastQualifyingIncidentAt)}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-300">
        A qualifying incident is a COD order returned specifically because the customer refused or did not accept
        delivery — not every returned order counts.
      </p>

      {canOverride && (
        <div className="mt-4 border-t border-ink-100 pt-4">
          {!showForm ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              {codRisk.codBlocked ? "Restore COD" : "Restrict COD"}
            </Button>
          ) : (
            <div className="space-y-2">
              {error && <p className="border border-clay/40 bg-clay/5 px-3 py-2 text-xs text-clay">{error}</p>}
              <label className="block text-xs text-ink-500">
                Note (required — {codRisk.codBlocked ? "why COD is being restored" : "why COD is being restricted"})
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
              />
              <div className="flex gap-2">
                <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => submit(!codRisk.codBlocked)}>
                  {busy ? "Saving…" : codRisk.codBlocked ? "Confirm Restore" : "Confirm Restrict"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
