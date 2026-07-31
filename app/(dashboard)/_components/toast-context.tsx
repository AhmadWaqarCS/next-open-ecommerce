"use client";

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
} from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD":
      // Cap at 5 toasts max — prevent spam
      return [...state.slice(-4), action.toast];
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

type ToastContextValue = {
  toasts: Toast[];
  toast: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  // useRef for the counter avoids re-renders on ID generation
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      // Sanitize: cap at 200 chars to prevent layout breakage
      const safeMessage = String(message).slice(0, 200);
      const id = `toast-${Date.now()}-${++counter.current}`;
      dispatch({ type: "ADD", toast: { id, message: safeMessage, variant } });
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
