"use client";

import { useState, type FormEvent } from "react";
import type {
  NavigationSettings,
  NavItemSetting,
  ShopByRoomSetting,
  ShopByRoomLinkSetting,
  MegaMenuColumnSetting,
} from "@/lib/settings/navigation";
import type { CategoryDTO, ThemeDTO } from "@/types";
import Button from "@/components/ui/Button";

function newItem(sortOrder: number): NavItemSetting {
  return { id: `nav-${Date.now()}`, label: "", href: "/", enabled: true, sortOrder };
}

function newRoomLink(sortOrder: number): ShopByRoomLinkSetting {
  return { id: `room-${Date.now()}`, label: "", href: "/categories", enabled: true, sortOrder };
}

/**
 * Top-level items only — the data model (NavItemSetting.children) supports
 * one level of nesting, but this v1 admin form keeps editing to a flat
 * list to stay simple. The "Shop by Room" column is curated, not
 * commerce-authoritative (Module 37 Part 11). The Categories/Themes mega-
 * menu columns (Module 38 Part 6) default to "auto" — always rebuilt from
 * real Category/Theme data — but can be switched to "custom" below to
 * hand-pick which entries appear.
 */
export default function NavigationContentForm({
  initial,
  categories,
  themes,
}: {
  initial: NavigationSettings;
  categories: CategoryDTO[];
  themes: ThemeDTO[];
}) {
  const [items, setItems] = useState<NavItemSetting[]>(initial.items);
  const [shopByRoom, setShopByRoom] = useState<ShopByRoomSetting>(initial.shopByRoom);
  const [megaMenuCategories, setMegaMenuCategories] = useState<MegaMenuColumnSetting>(initial.megaMenuCategories);
  const [megaMenuThemes, setMegaMenuThemes] = useState<MegaMenuColumnSetting>(initial.megaMenuThemes);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<NavItemSetting>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((it, i) => ({ ...it, sortOrder: i }));
    });
  }

  function updateRoomLink(index: number, patch: Partial<ShopByRoomLinkSetting>) {
    setShopByRoom((prev) => ({ ...prev, links: prev.links.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  }

  function removeRoomLink(index: number) {
    setShopByRoom((prev) => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }));
  }

  function moveRoomLink(index: number, direction: -1 | 1) {
    setShopByRoom((prev) => {
      const next = [...prev.links];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, links: next.map((l, i) => ({ ...l, sortOrder: i })) };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/navigation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it, i) => ({ ...it, sortOrder: i })),
          shopByRoom: { ...shopByRoom, links: shopByRoom.links.map((l, i) => ({ ...l, sortOrder: i })) },
          megaMenuCategories: { ...megaMenuCategories, refs: megaMenuCategories.refs.map((r, i) => ({ ...r, sortOrder: i })) },
          megaMenuThemes: { ...megaMenuThemes, refs: megaMenuThemes.refs.map((r, i) => ({ ...r, sortOrder: i })) },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save navigation.");
        return;
      }
      setMessage("Navigation saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className="flex flex-wrap items-center gap-3 border border-ink-100 bg-bone p-3">
          <input type="checkbox" checked={item.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
          <input
            type="text"
            required
            placeholder="Label"
            value={item.label}
            onChange={(e) => update(index, { label: e.target.value })}
            className="w-32 border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          <input
            type="text"
            required
            placeholder="/path"
            value={item.href}
            onChange={(e) => update(index, { href: e.target.value })}
            className="min-w-[160px] flex-1 border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
              ↑
            </button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
              ↓
            </button>
            <button type="button" onClick={() => remove(index)} className="text-clay hover:underline">
              Remove
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, newItem(prev.length)])}
        className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
      >
        + Add Menu Item
      </button>

      <div className="border-t border-ink-100 pt-6">
        <p className="mb-1 font-display text-sm text-ink">Shop Menu — &quot;Shop by Room&quot; Column</p>
        <p className="mb-3 text-xs text-ink-500">Curated shortcuts shown in the Shop mega-menu. Categories/Themes columns always reflect your real catalog and aren&apos;t edited here.</p>

        <label className="mb-3 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={shopByRoom.enabled} onChange={(e) => setShopByRoom((p) => ({ ...p, enabled: e.target.checked }))} className="h-4 w-4" />
          Show this column
        </label>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-ink-500">Column Heading</label>
          <input
            type="text"
            value={shopByRoom.heading}
            onChange={(e) => setShopByRoom((p) => ({ ...p, heading: e.target.value }))}
            className="w-full max-w-xs border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          {shopByRoom.links.map((link, index) => (
            <div key={link.id} className="flex flex-wrap items-center gap-3 border border-ink-100 bg-bone-100 p-3">
              <input type="checkbox" checked={link.enabled} onChange={(e) => updateRoomLink(index, { enabled: e.target.checked })} className="h-4 w-4" />
              <input
                type="text"
                placeholder="Label"
                value={link.label}
                onChange={(e) => updateRoomLink(index, { label: e.target.value })}
                className="w-32 border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
              />
              <input
                type="text"
                placeholder="/path"
                value={link.href}
                onChange={(e) => updateRoomLink(index, { href: e.target.value })}
                className="min-w-[160px] flex-1 border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
              />
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => moveRoomLink(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => moveRoomLink(index, 1)} disabled={index === shopByRoom.links.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => removeRoomLink(index)} className="text-clay hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShopByRoom((p) => ({ ...p, links: [...p.links, newRoomLink(p.links.length)] }))}
          className="mt-2 border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
        >
          + Add Room Link
        </button>
      </div>

      <MegaMenuColumnEditor
        title="Shop Menu — Categories Column"
        section={megaMenuCategories}
        onChange={setMegaMenuCategories}
        options={categories}
      />
      <MegaMenuColumnEditor
        title="Shop Menu — Themes Column"
        section={megaMenuThemes}
        onChange={setMegaMenuThemes}
        options={themes}
      />

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <div>
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

interface MegaMenuOption {
  id: string;
  name: string;
  isVisible?: boolean;
  isEnabled?: boolean;
}

function MegaMenuColumnEditor({
  title,
  section,
  onChange,
  options,
}: {
  title: string;
  section: MegaMenuColumnSetting;
  onChange: (next: MegaMenuColumnSetting) => void;
  options: MegaMenuOption[];
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const pickedIds = new Set(section.refs.map((r) => r.id));
  const isHiddenSource = (o: MegaMenuOption) => o.isVisible === false || o.isEnabled === false;

  function moveRef(index: number, direction: -1 | 1) {
    const next = [...section.refs];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...section, refs: next.map((r, i) => ({ ...r, sortOrder: i })) });
  }

  return (
    <div className="border-t border-ink-100 pt-6">
      <p className="mb-1 font-display text-sm text-ink">{title}</p>

      <div>
        <label className="mb-1 block text-xs text-ink-500">Column Heading</label>
        <input
          type="text"
          value={section.heading}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          className="mb-3 w-full max-w-xs border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      <div className="mb-3 flex gap-4 text-sm text-ink-700">
        <label className="flex items-center gap-2">
          <input type="radio" checked={section.mode === "auto"} onChange={() => onChange({ ...section, mode: "auto" })} className="h-4 w-4" />
          Auto (live catalog order)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={section.mode === "custom"} onChange={() => onChange({ ...section, mode: "custom" })} className="h-4 w-4" />
          Custom (hand-pick)
        </label>
      </div>

      {section.mode === "auto" ? (
        <div>
          <label className="mb-1 block text-xs text-ink-500">Show how many</label>
          <input
            type="number"
            min={1}
            max={20}
            value={section.limit}
            onChange={(e) => onChange({ ...section, limit: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
            className="w-24 border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {section.refs.map((ref, index) => {
              const entity = byId.get(ref.id);
              return (
                <div key={ref.id} className="flex flex-wrap items-center gap-3 border border-ink-100 bg-bone-100 p-3">
                  <span className="flex-1 text-sm text-ink">
                    {entity ? entity.name : `(no longer exists — will be dropped)`}
                    {entity && isHiddenSource(entity) && <span className="ml-2 text-xs text-clay">hidden — won&apos;t appear until unhidden</span>}
                  </span>
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={() => moveRef(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveRef(index, 1)} disabled={index === section.refs.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">↓</button>
                    <button
                      type="button"
                      onClick={() => onChange({ ...section, refs: section.refs.filter((r) => r.id !== ref.id) })}
                      className="text-clay hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
            {section.refs.length === 0 && <p className="text-xs text-ink-500">No items picked yet — the column will render empty.</p>}
          </div>

          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              onChange({ ...section, refs: [...section.refs, { id: e.target.value, sortOrder: section.refs.length }] });
            }}
            className="w-full max-w-sm border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          >
            <option value="">+ Add…</option>
            {options
              .filter((o) => !pickedIds.has(o.id))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {isHiddenSource(o) ? " (hidden)" : ""}
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );
}
