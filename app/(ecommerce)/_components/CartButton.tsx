"use client";

import { useCart } from "@/lib/cart";

export default function CartButton() {
  const { itemCount, openDrawer } = useCart();

  return (
    <button
      id="cart-button"
      type="button"
      onClick={openDrawer}
      aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
      className="header-icon-btn relative transition-colors duration-300"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"
        />
      </svg>
      {itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 bg-zinc-900 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center cart-badge"
        >
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </button>
  );
}
