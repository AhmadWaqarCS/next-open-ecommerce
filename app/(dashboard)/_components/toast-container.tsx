"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToasts } from "./toast-context";
import { ToastItem } from "./toast-item";

export function ToastContainer() {
  const toasts = useToasts();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] pointer-events-none flex flex-col gap-2.5 w-full max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden p-1"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body
  );
}
