"use client";

import { useEffect } from "react";
import { Toast, useToast } from "./toast-context";

const DURATIONS: Record<Toast["variant"], number> = {
  success: 4000,
  error: 7000, // errors stay longer
  info: 4000,
  warning: 5000,
};

const VARIANT_STYLES: Record<
  Toast["variant"],
  { container: string; icon: React.ReactNode }
> = {
  success: {
    container: "bg-white dark:bg-zinc-900 border-emerald-500 text-zinc-900 dark:text-zinc-50 shadow-emerald-500/5",
    icon: (
      <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    container: "bg-white dark:bg-zinc-900 border-red-500 text-zinc-900 dark:text-zinc-50 shadow-red-500/5",
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    container: "bg-white dark:bg-zinc-900 border-blue-500 text-zinc-900 dark:text-zinc-50 shadow-blue-500/5",
    icon: (
      <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    container: "bg-white dark:bg-zinc-900 border-amber-500 text-zinc-900 dark:text-zinc-50 shadow-amber-500/5",
    icon: (
      <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

export function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), DURATIONS[toast.variant]);
    // Cleanup prevents the dismiss firing if the user manually closes it first
    return () => clearTimeout(timer);
  }, [toast.id, toast.variant, dismiss]);

  const style = VARIANT_STYLES[toast.variant];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`pointer-events-auto flex items-center justify-between gap-3 w-full p-4 rounded-xl border-l-4 border-y border-r border-zinc-200 dark:border-zinc-800 shadow-lg animate-slide-in-right ${style.container}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{style.icon}</div>
        <span className="text-sm font-medium leading-5">{toast.message}</span>
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-all"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
