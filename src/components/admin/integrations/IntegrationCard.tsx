"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { IntegrationAction, ReadinessState } from "@/lib/integrations/integration-status";

export interface SerializedIntegrationStatus {
  key: string;
  name: string;
  currentProvider: string;
  modeLabel: string;
  modeIsMock: boolean;
  modeWarning?: string;
  implementationStatus: string;
  implementationNote?: string;
  credentialStatus: string;
  missingConfig: string[];
  readiness: ReadinessState;
  readinessLabel: string;
  lastTest: { at: string; result: "success" | "failure"; detail?: string } | null;
  actions: IntegrationAction[];
  notes: string[];
}

const READINESS_STYLES: Record<ReadinessState, string> = {
  NOT_CONFIGURED: "bg-ink-100 text-ink-600",
  CONFIGURED_NOT_TESTED: "bg-amber-100 text-amber-800",
  TEST_FAILED: "bg-clay/15 text-clay",
  TEST_PASSED: "bg-green-100 text-green-800",
  PARTIALLY_IMPLEMENTED: "bg-amber-100 text-amber-800",
  MOCK_ONLY: "bg-ink-100 text-ink-600",
  PRODUCTION_READY: "bg-green-100 text-green-800",
};

function ActionButton({ integrationKey, action }: { integrationKey: string; action: IntegrationAction }) {
  const router = useRouter();
  const needsDestination = action.key === "test_send";
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(action.endpoint, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: needsDestination ? JSON.stringify({ to: destination || undefined }) : undefined,
      });
      const json = await res.json();
      if (!json.success) {
        setResult({ ok: false, detail: json.error || "Action failed." });
      } else {
        setResult({ ok: json.data.ok, detail: json.data.detail });
      }
      router.refresh();
    } catch {
      setResult({ ok: false, detail: "Network error." });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="border border-ink-100 bg-bone-100 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink">{action.label}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {action.isRealSideEffect ? "⚠ Contacts a real external provider." : "Safe — no real external provider is contacted."} {action.description}
          </p>
        </div>
      </div>

      {needsDestination && (
        <input
          type="text"
          placeholder={integrationKey === "whatsapp" ? "Destination phone number (required)" : "Destination email (defaults to your own)"}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="mt-2 w-full border border-ink-100 bg-bone px-3 py-1.5 text-sm focus:border-brass focus:outline-none"
        />
      )}

      <div className="mt-2 flex items-center gap-2">
        {!confirming ? (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => (action.isRealSideEffect ? setConfirming(true) : run())}>
            {busy ? "Running…" : action.label}
          </Button>
        ) : (
          <>
            <span className="text-xs text-ink-500">This will contact a real external provider. Continue?</span>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={run}>
              {busy ? "Running…" : "Confirm"}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {result && (
        <p className={`mt-2 text-xs ${result.ok ? "text-green-700" : "text-clay"}`}>
          {result.ok ? "✓" : "✕"} {result.detail}
        </p>
      )}
    </div>
  );
}

export default function IntegrationCard({ status, checklist }: { status: SerializedIntegrationStatus; checklist: string[] }) {
  return (
    <section className="border border-ink-100 bg-bone p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-display text-lg text-ink">{status.name}</h2>
        <span className={`px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${READINESS_STYLES[status.readiness]}`}>{status.readinessLabel}</span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-400">Current provider</dt>
          <dd className="text-ink-700">{status.currentProvider}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-400">Mode</dt>
          <dd className="text-ink-700">{status.modeLabel}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-400">Implementation</dt>
          <dd className="text-ink-700">{status.implementationStatus}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-400">Credentials</dt>
          <dd className="text-ink-700">{status.credentialStatus}</dd>
        </div>
      </dl>

      {status.modeWarning && <p className="mt-3 border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">{status.modeWarning}</p>}

      {status.missingConfig.length > 0 && (
        <div className="mt-3 border border-ink-100 bg-bone-100 px-3 py-2 text-xs text-ink-600">
          <p className="mb-1 font-medium text-ink">Missing:</p>
          <ul className="list-inside list-disc space-y-0.5">
            {status.missingConfig.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {status.implementationNote && <p className="mt-3 text-xs text-ink-500">{status.implementationNote}</p>}

      <div className="mt-3 text-xs text-ink-500">
        <span className="font-medium text-ink">Last test: </span>
        {status.lastTest ? (
          <>
            {status.lastTest.result === "success" ? "✓ Passed" : "✕ Failed"} — {new Date(status.lastTest.at).toLocaleString("en-IN")}
            {status.lastTest.detail ? ` — ${status.lastTest.detail}` : ""}
          </>
        ) : (
          "Not tested yet from this dashboard."
        )}
      </div>

      {status.notes.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-xs text-ink-500">
          {status.notes.map((n, i) => (
            <li key={i}>· {n}</li>
          ))}
        </ul>
      )}

      {status.actions.length > 0 && (
        <div className="mt-4 space-y-2">
          {status.actions.map((a) => (
            <ActionButton key={a.key} integrationKey={status.key} action={a} />
          ))}
        </div>
      )}

      <details className="mt-4 border-t border-ink-100 pt-3">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-ink-500">Production Activation Checklist</summary>
        <ul className="mt-2 space-y-1 text-sm text-ink-700">
          {checklist.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-3.5 w-3.5 flex-shrink-0 border border-ink-300" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-400">This checklist is reference material — items are not auto-detected and cannot be checked off from this dashboard.</p>
      </details>
    </section>
  );
}
