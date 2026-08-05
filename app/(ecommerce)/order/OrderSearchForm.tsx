"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderSearchForm({ storeName }: { storeName: string }) {
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderNumber.trim();
    if (!clean) {
      setError("Please enter a valid order number.");
      return;
    }
    setError(null);
    router.push(`/order/${clean}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="order_number" className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
          Order Number
        </label>
        <div className="relative">
          <input
            id="order_number"
            type="text"
            value={orderNumber}
            onChange={(e) => {
              setOrderNumber(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. ORD-20260805-X9Y2Z8"
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
            required
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
      </div>

      <button
        type="submit"
        className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
      >
        <span>Track Order</span>
        <svg
          className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </form>
  );
}
