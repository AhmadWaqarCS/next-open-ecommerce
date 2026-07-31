"use client";

import { useState, useEffect } from "react";

/**
 * MobileMenuToggle — the ONLY client component in the header.
 *
 * Clicking toggles a `data-mobile-open` attribute on the nearest <header>
 * ancestor, which CSS in ecommerce-style.css uses to show/hide the drawer
 * and swap the hamburger ↔ close icon.
 */
export default function MobileMenuToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const header = document.querySelector("header.header-root");
    if (header) {
      if (open) {
        header.setAttribute("data-mobile-open", "true");
        document.body.style.overflow = "hidden";
      } else {
        header.removeAttribute("data-mobile-open");
        document.body.style.overflow = "";
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on route change (popstate / navigation)
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  return (
    <button
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      className="md:hidden header-icon-btn transition-colors duration-300"
    >
      {open ? (
        /* X icon */
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        /* Hamburger icon */
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );
}
