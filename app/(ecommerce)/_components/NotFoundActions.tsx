"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NotFoundActions() {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Go Back
      </button>

      <Link
        href="/"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 font-semibold text-sm transition-all active:scale-[0.98]"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        Return to Store
      </Link>
    </div>
  );
}
