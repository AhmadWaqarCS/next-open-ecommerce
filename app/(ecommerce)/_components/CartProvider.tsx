"use client";

import { useReducer, useEffect, useCallback, useState } from "react";
import {
  CartContext,
  CartItem,
  cartReducer,
  initialCartState,
} from "@/lib/cart";

const CART_STORAGE_KEY = "noe_cart_v1";

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [hydrated, setHydrated] = useState(false);

  // ── Hydrate from localStorage on mount ───────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            dispatch({ type: "ADD_ITEM", payload: item });
          });
        }
      }
    } catch {
      // Ignore parse errors — start with empty cart
    } finally {
      setHydrated(true);
    }
  }, []);

  // ── Persist to localStorage on every items change & notify other providers ──
  useEffect(() => {
    try {
      const currentStr = JSON.stringify(state.items);
      const storedStr = localStorage.getItem(CART_STORAGE_KEY) || "[]";
      if (currentStr !== storedStr) {
        localStorage.setItem(CART_STORAGE_KEY, currentStr);
        window.dispatchEvent(
          new CustomEvent("noe-cart-sync", { detail: state.items })
        );
      }
    } catch {
      // Ignore storage errors (private mode, quota exceeded)
    }
  }, [state.items]);

  // ── Listen to custom events from other providers to keep synced in real-time ──
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEv = e as CustomEvent<CartItem[]>;
      const items = customEv.detail;
      if (JSON.stringify(state.items) !== JSON.stringify(items)) {
        dispatch({ type: "SYNC_ITEMS", items });
      }
    };
    const handleOpen = () => {
      dispatch({ type: "OPEN_DRAWER" });
    };
    const handleClose = () => {
      dispatch({ type: "CLOSE_DRAWER" });
    };

    window.addEventListener("noe-cart-sync", handleSync);
    window.addEventListener("noe-cart-open-drawer", handleOpen);
    window.addEventListener("noe-cart-close-drawer", handleClose);

    return () => {
      window.removeEventListener("noe-cart-sync", handleSync);
      window.removeEventListener("noe-cart-open-drawer", handleOpen);
      window.removeEventListener("noe-cart-close-drawer", handleClose);
    };
  }, [state.items]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0,
  );

  // ── Convenience helpers ───────────────────────────────────────────────────
  const addItem = useCallback(
    (item: Omit<CartItem, "key">) => dispatch({ type: "ADD_ITEM", payload: item }),
    [],
  );
  const removeItem = useCallback(
    (key: string) => dispatch({ type: "REMOVE_ITEM", key }),
    [],
  );
  const updateQty = useCallback(
    (key: string, quantity: number) =>
      dispatch({ type: "UPDATE_QTY", key, quantity }),
    [],
  );
  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
    // LocalStorage useEffect will fire sync event
  }, []);
  const openDrawer = useCallback(() => {
    dispatch({ type: "OPEN_DRAWER" });
    window.dispatchEvent(new Event("noe-cart-open-drawer"));
  }, []);
  const closeDrawer = useCallback(() => {
    dispatch({ type: "CLOSE_DRAWER" });
    window.dispatchEvent(new Event("noe-cart-close-drawer"));
  }, []);

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        hydrated,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
