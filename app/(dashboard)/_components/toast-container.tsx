"use client";
import { createPortal } from "react-dom";
import { useToast } from "./toast-context";
import { ToastItem } from "./toast-item";

export function ToastContainer() {
  const { toasts } = useToast();

  // Portal to <body> keeps it above dialogs/modals in the stacking context
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-md pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  );
}
