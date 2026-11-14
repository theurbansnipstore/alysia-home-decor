"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Module 37 Part 14 fix: the expanded search input used to render inline
 * in the header's flex row (a plain sibling of the nav/cart/account
 * icons). Opening it inserted ~144-224px of extra width directly into
 * that row, pushing and visually overlapping the adjacent menu items —
 * "clicking the search icon overlaps menu items". It's now an absolutely
 * positioned dropdown anchored to the trigger button (a `relative`
 * wrapper), so opening it never changes the width of the surrounding
 * header row — nothing else can be pushed or covered by construction.
 * Search backend/logic (the /shop?q= redirect) is untouched.
 */
export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close search" : "Search"}
        aria-expanded={open}
        className="text-ink-700 transition-colors hover:text-brass-600"
      >
        {open ? <X size={19} /> : <Search size={19} />}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          role="search"
          className="absolute right-0 top-full z-50 mt-2 w-64 border border-ink-100 bg-bone p-2 shadow-card sm:w-72"
        >
          <label htmlFor="header-search" className="sr-only">
            Search products
          </label>
          <input
            ref={inputRef}
            id="header-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full border-b border-ink-300 bg-transparent px-1 py-1.5 text-sm focus:border-brass focus:outline-none"
          />
        </form>
      )}
    </div>
  );
}
