"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

export interface PageFormValues {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  seoDesc: string;
}

interface PageFormProps {
  mode: "create" | "edit";
  pageId?: string;
  initial: PageFormValues;
  initialStatus?: "DRAFT" | "PUBLISHED";
}

const EMPTY: PageFormValues = { title: "", slug: "", content: "", excerpt: "", seoTitle: "", seoDesc: "" };

/**
 * Shared create/edit form. Slugifies the title into the slug field only
 * while the admin hasn't touched slug directly (slugTouched), matching the
 * "auto-suggest, never fight a manual edit" pattern already used for
 * product slugs elsewhere in the admin.
 */
export default function PageForm({ mode, pageId, initial, initialStatus }: PageFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<PageFormValues>({ ...EMPTY, ...initial });
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(initialStatus ?? "DRAFT");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setValues((v) => ({
      ...v,
      title,
      slug: slugTouched
        ? v.slug
        : title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
    }));
  }

  function field(key: keyof PageFormValues) {
    return {
      value: values[key],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (key === "slug") setSlugTouched(true);
        setValues((v) => ({ ...v, [key]: e.target.value }));
      },
    };
  }

  async function save(nextStatus: "DRAFT" | "PUBLISHED") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body = { ...values, excerpt: values.excerpt || null, seoTitle: values.seoTitle || null, seoDesc: values.seoDesc || null, status: nextStatus };
      const res = await fetch(mode === "create" ? "/api/admin/pages" : `/api/admin/pages/${pageId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save this page.");
        return;
      }
      setStatus(nextStatus);
      if (mode === "create") {
        router.push(`/admin/content/pages/${json.data.id}`);
      } else {
        setMessage(nextStatus === "PUBLISHED" ? "Page published." : "Page saved.");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await save(status);
  }

  async function handleDelete() {
    if (!pageId) return;
    if (!confirm(`Delete "${values.title}"? This can't be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't delete this page.");
        return;
      }
      router.push("/admin/content/pages");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="space-y-4 border border-ink-100 bg-bone p-6">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Title</label>
          <input type="text" value={values.title} onChange={handleTitleChange} required className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Slug (goes live at /{values.slug || "your-slug"})</label>
          <input type="text" {...field("slug")} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Excerpt (optional — used as the SEO description fallback)</label>
          <textarea rows={2} {...field("excerpt")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-ink-500">Content (plain text — paragraph breaks are preserved)</label>
            <button type="button" onClick={() => setShowPreview((p) => !p)} className="text-xs text-brass-600 hover:underline">
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>
          {showPreview ? (
            <div className="min-h-[240px] whitespace-pre-line border border-ink-100 bg-bone-50 px-3 py-2 text-sm leading-relaxed text-ink-500">
              {values.content || <span className="text-ink-300">Nothing to preview yet.</span>}
            </div>
          ) : (
            <textarea rows={12} required {...field("content")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
          )}
        </div>
      </div>

      <div className="space-y-4 border border-ink-100 bg-bone p-6">
        <p className="font-display text-sm text-ink">SEO</p>
        <div>
          <label className="mb-1 block text-xs text-ink-500">SEO Title (optional — falls back to a generated title)</label>
          <input type="text" {...field("seoTitle")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">SEO Description (optional — falls back to the excerpt)</label>
          <textarea rows={2} {...field("seoDesc")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          {busy ? "Saving…" : status === "PUBLISHED" ? "Save" : "Save Draft"}
        </Button>
        {status !== "PUBLISHED" && (
          <Button type="button" variant="brass" size="sm" disabled={busy} onClick={() => save("PUBLISHED")}>
            Publish
          </Button>
        )}
        {status === "PUBLISHED" && (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => save("DRAFT")}>
            Unpublish
          </Button>
        )}
        {mode === "edit" && status === "PUBLISHED" && (
          <Link href={`/${values.slug}`} target="_blank" className="text-xs text-ink-500 hover:text-brass-600 hover:underline">
            View live page →
          </Link>
        )}
        {mode === "edit" && (
          <button type="button" onClick={handleDelete} disabled={busy} className="ml-auto text-xs text-clay hover:underline disabled:opacity-50">
            Delete page
          </button>
        )}
      </div>
    </form>
  );
}
