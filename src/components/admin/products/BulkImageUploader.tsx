"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";

interface SkippedFile {
  filename: string;
  reason: string;
}

interface UploadResult {
  uploaded: number;
  skipped: SkippedFile[];
}

export default function BulkImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      Array.from(fileList).forEach((f) => form.append("files", f));
      const res = await fetch("/api/admin/products/images/bulk-upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Bulk upload failed.");
        return;
      }
      setResult(json.data as UploadResult);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-2xl border border-ink-100 bg-bone p-6">
      {error && <p className="mb-4 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
        className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:text-bone-100"
      />
      {busy && <p className="mt-2 text-xs text-ink-500">Uploading…</p>}

      {result && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink-700">
            <strong className="text-green-700">{result.uploaded}</strong> image{result.uploaded === 1 ? "" : "s"} uploaded
            {result.skipped.length > 0 && (
              <>
                {" "}
                · <strong className="text-clay">{result.skipped.length}</strong> skipped
              </>
            )}
          </p>
          {result.skipped.length > 0 && (
            <div className="border border-clay/30 bg-clay/5 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-clay">Skipped</p>
              <ul className="max-h-56 space-y-1 overflow-y-auto text-xs text-ink-700">
                {result.skipped.map((s) => (
                  <li key={s.filename}>
                    <strong>{s.filename}:</strong> {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-ink-100 pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Upload More
        </Button>
      </div>
    </div>
  );
}
