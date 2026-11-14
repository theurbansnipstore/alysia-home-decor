interface RedirectRow {
  id: string;
  oldSlug: string;
  createdAt: Date | string;
}

interface RedirectHistoryPanelProps {
  currentSlug: string;
  redirects: RedirectRow[];
}

/**
 * Read-only (Module 32 Part 14 — no editor, no bulk import, no analytics).
 * Every row redirects to the same destination: whatever this product's
 * slug is today, since resolution always re-reads the live slug rather
 * than a stored target.
 */
export default function RedirectHistoryPanel({ currentSlug, redirects }: RedirectHistoryPanelProps) {
  if (redirects.length === 0) return null;

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-3 font-display text-base text-ink">Previous URLs</h2>
      <p className="mb-3 text-xs text-ink-500">
        These old product URLs redirect permanently to the current one below.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
            <th className="px-3 py-2">Previous URL</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Redirects to</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {redirects.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-ink-700">/product/{r.oldSlug}</td>
              <td className="px-3 py-2 text-ink-500">{new Date(r.createdAt).toLocaleDateString()}</td>
              <td className="px-3 py-2 text-ink-700">/product/{currentSlug}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
