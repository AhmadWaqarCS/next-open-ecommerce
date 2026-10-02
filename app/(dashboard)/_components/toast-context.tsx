"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  title?: string;
  duration?: number; // Duration in ms; set to 0 or negative for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
};

export type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
  isExiting?: boolean;
};

export type ActionResponseLike = {
  success?: boolean;
  message?: string | null;
  error?: string | null;
} | null | undefined;

export type ToastFn = {
  (message: string, variant?: ToastVariant, options?: ToastOptions): string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  action: (
    response: ActionResponseLike,
    fallbackSuccess?: string,
    fallbackError?: string
  ) => string | undefined;
  dismiss: (id: string) => void;
  clear: () => void;
};

export type ToastContextValue = {
  toasts: Toast[];
  toast: ToastFn;
  dismiss: (id: string) => void;
};

// -----------------------------------------------------------------------------
// In-Memory Reactive Toast Store
// -----------------------------------------------------------------------------

const MAX_TOASTS = 5;
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let counter = 0;

function notify() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): Toast[] {
  return toasts;
}

function getServerSnapshot(): Toast[] {
  return [];
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function createToast(
  message: string,
  variant: ToastVariant = "info",
  options?: ToastOptions
): string {
  const safeMessage = String(message ?? "").slice(0, 300);
  const id = `toast-${Date.now()}-${++counter}`;

  const newToast: Toast = {
    id,
    message: safeMessage,
    variant,
    title: options?.title,
    duration: options?.duration,
    action: options?.action,
    createdAt: Date.now(),
    isExiting: false,
  };

  // Limit stacked toasts to MAX_TOASTS to avoid viewport crowding
  if (toasts.length >= MAX_TOASTS) {
    toasts = toasts.slice(toasts.length - (MAX_TOASTS - 1));
  }

  toasts = [...toasts, newToast];
  notify();
  return id;
}

function dismissToast(id: string) {
  const target = toasts.find((t) => t.id === id);
  if (!target || target.isExiting) return;

  // Trigger exit animation
  toasts = toasts.map((t) => (t.id === id ? { ...t, isExiting: true } : t));
  notify();

  // Remove completely after exit transition
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 220);
}

function clearAllToasts() {
  toasts = [];
  notify();
}

// -----------------------------------------------------------------------------
// Singleton Toast Controller
// -----------------------------------------------------------------------------

export const toast: ToastFn = Object.assign(
  function (
    message: string,
    variant: ToastVariant = "info",
    options?: ToastOptions
  ): string {
    return createToast(message, variant, options);
  },
  {
    success(message: string, options?: ToastOptions) {
      return createToast(message, "success", options);
    },
    error(message: string, options?: ToastOptions) {
      return createToast(message, "error", options);
    },
    info(message: string, options?: ToastOptions) {
      return createToast(message, "info", options);
    },
    warning(message: string, options?: ToastOptions) {
      return createToast(message, "warning", options);
    },
    action(
      response: ActionResponseLike,
      fallbackSuccess = "Action completed successfully.",
      fallbackError = "An unexpected error occurred."
    ) {
      if (!response) {
        return createToast(fallbackError, "error");
      }
      if (response.success) {
        return createToast(response.message || fallbackSuccess, "success");
      } else {
        return createToast(
          response.message || response.error || fallbackError,
          "error"
        );
      }
    },
    dismiss(id: string) {
      dismissToast(id);
    },
    clear() {
      clearAllToasts();
    },
  }
);

export const dismiss = dismissToast;
export const clear = clearAllToasts;

// -----------------------------------------------------------------------------
// React Context & Hooks
// -----------------------------------------------------------------------------

const stableContextValue: ToastContextValue = {
  get toasts() {
    return toasts;
  },
  toast,
  dismiss: dismissToast,
};

const ToastContext = createContext<ToastContextValue>(stableContextValue);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Stable context wrapper: does not re-render children when toasts change
  return (
    <ToastContext.Provider value={stableContextValue}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to read the current reactive toasts list.
 * Only the component calling this (ToastContainer) subscribes and re-renders on changes.
 */
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Main toast hook used across dashboard components.
 * Stable reference: calling `const { toast } = useToast()` does NOT cause re-renders when toasts change.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx || stableContextValue;
}
