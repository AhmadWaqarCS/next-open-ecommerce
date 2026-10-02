"use client";

import { useEffect, useRef, useState } from "react";
import { Toast, useToast } from "./toast-context";

const DEFAULT_DURATIONS: Record<Toast["variant"], number> = {
  success: 4000,
  error: 6500, // errors stay longer for readability
  info: 4000,
  warning: 5000,
};

const VARIANT_CONFIG: Record<
  Toast["variant"],
  {
    container: string;
    iconBadge: string;
    role: "status" | "alert";
    ariaLive: "polite" | "assertive";
    icon: React.ReactNode;
  }
> = {
  success: {
    container:
      "border-l-4 border-l-dashboard-accent border-dashboard-border bg-dashboard-card text-dashboard-fg",
    iconBadge: "bg-dashboard-accent-subtle text-dashboard-accent",
    role: "status",
    ariaLive: "polite",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  error: {
    container:
      "border-l-4 border-l-dashboard-danger border-dashboard-border bg-dashboard-card text-dashboard-fg",
    iconBadge: "bg-dashboard-danger-subtle text-dashboard-danger",
    role: "alert",
    ariaLive: "assertive",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  info: {
    container:
      "border-l-4 border-l-dashboard-primary border-dashboard-border bg-dashboard-card text-dashboard-fg",
    iconBadge: "bg-dashboard-primary/10 text-dashboard-primary",
    role: "status",
    ariaLive: "polite",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  warning: {
    container:
      "border-l-4 border-l-amber-500 border-dashboard-border bg-dashboard-card text-dashboard-fg",
    iconBadge: "bg-amber-500/10 text-amber-500 dark:text-amber-400",
    role: "status",
    ariaLive: "polite",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
};

export function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const config = VARIANT_CONFIG[toast.variant];

  // Duration: custom toast duration takes precedence; 0 or negative = persistent
  const initialDuration =
    toast.duration !== undefined
      ? toast.duration
      : DEFAULT_DURATIONS[toast.variant];

  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef<number>(initialDuration);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Persistent notification (duration <= 0) does not auto-dismiss
    if (remainingRef.current <= 0) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        dismiss(toast.id);
      }, remainingRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, toast.id, dismiss]);

  function handleMouseEnter() {
    if (remainingRef.current <= 0) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    setIsPaused(true);
  }

  function handleMouseLeave() {
    if (remainingRef.current <= 0) return;
    // Provide at least 1200ms when mouse leaves to prevent abrupt disappearance
    remainingRef.current = Math.max(remainingRef.current, 1200);
    setIsPaused(false);
  }

  return (
    <div
      role={config.role}
      aria-live={config.ariaLive}
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={`pointer-events-auto flex items-start justify-between gap-3 w-full p-4 rounded-2xl border shadow-lg transition-all duration-200 ${
        toast.isExiting
          ? "opacity-0 translate-x-8 scale-95 pointer-events-none"
          : "opacity-100 translate-x-0 scale-100 animate-slide-in-right"
      } ${config.container}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className={`flex-shrink-0 p-1 rounded-lg ${config.iconBadge}`}
          aria-hidden="true"
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          {toast.title && (
            <h4 className="text-sm font-bold text-dashboard-fg mb-0.5 leading-snug">
              {toast.title}
            </h4>
          )}
          <p className="text-sm font-medium leading-relaxed text-dashboard-fg break-words">
            {toast.message}
          </p>
          {toast.action && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-dashboard-primary text-dashboard-primary-fg hover:bg-dashboard-primary-hover transition-colors shadow-xs cursor-pointer"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 rounded-lg p-1 text-dashboard-muted hover:text-dashboard-fg hover:bg-dashboard-card-hover transition-colors cursor-pointer"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
