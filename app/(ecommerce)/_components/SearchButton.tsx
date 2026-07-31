"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SearchButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="relative">
      <button
        aria-label="Search"
        onClick={() => setOpen((v) => !v)}
        className="header-icon-btn transition-colors duration-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
      </button>

      {open && (
        <div className="search-popover absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-zinc-200 shadow-xl p-2 z-50">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              maxLength={100}
              className="flex-1 px-3 py-2 text-sm text-zinc-900 bg-zinc-50 rounded-lg border border-zinc-200 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition"
            />
            <button
              type="submit"
              className="bg-zinc-900 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Go
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
