"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";

interface CartDrawerProps {
  currencySymbol?: string;
}

export default function CartDrawer({ currencySymbol = "$" }: CartDrawerProps) {
  const { state, itemCount, subtotal, removeItem, updateQty, closeDrawer } =
    useCart();

  const { items, drawerOpen } = state;

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────────────────────── */}
      <div
        className={`cart-backdrop ${drawerOpen ? "cart-backdrop--open" : ""}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* ── Drawer panel ───────────────────────────────────────────────────── */}
      <aside
        id="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`cart-drawer ${drawerOpen ? "cart-drawer--open" : ""}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-base font-bold text-zinc-900">
            Your Cart{" "}
            {itemCount > 0 && (
              <span className="ml-1 text-xs font-semibold text-zinc-400">
                ({itemCount} {itemCount === 1 ? "item" : "items"})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <svg
              className="w-5 h-5"
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

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-zinc-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-700">
                  Your cart is empty
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Add some products to get started
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="text-xs font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="flex gap-3 py-3 border-b border-zinc-50 last:border-0"
                >
                  {/* Image */}
                  <div className="relative w-16 h-16 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        // unoptimized
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1}
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 line-clamp-1">
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {item.variantName}
                      </p>
                    )}
                    <p className="text-sm font-bold text-zinc-900 mt-1">
                      {currencySymbol}
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => updateQty(item.key, item.quantity - 1)}
                          className="px-2 py-1 text-zinc-500 hover:bg-zinc-50 transition-colors"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="px-2.5 py-1 text-zinc-900 font-medium min-w-[1.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.key, item.quantity + 1)}
                          className="px-2 py-1 text-zinc-500 hover:bg-zinc-50 transition-colors"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="text-xs text-zinc-400 hover:text-red-500 transition-colors ml-auto"
                        aria-label="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-zinc-100 px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-zinc-500">Subtotal</span>
              <span className="text-base font-bold text-zinc-900">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Shipping and taxes calculated at checkout
            </p>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full bg-zinc-900 text-white text-center font-semibold py-3.5 rounded-xl hover:bg-zinc-700 active:scale-[0.98] transition-all duration-200 text-sm"
            >
              Checkout
            </Link>
            <button
              type="button"
              onClick={closeDrawer}
              className="block w-full text-center text-xs text-zinc-400 hover:text-zinc-700 transition-colors mt-3"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
