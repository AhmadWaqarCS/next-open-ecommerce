"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardNotFound() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
        {/* 404 Graphic / Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-6 border border-indigo-100 dark:border-indigo-900/50">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/60 dark:bg-indigo-900/40 rounded-full mb-3">
          Error 404
        </span>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
          Page Not Found
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
          The dashboard page you are trying to access does not exist, has been moved, or is temporarily unavailable.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
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
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm transition-all active:scale-[0.98]"
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
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
