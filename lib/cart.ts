"use client";

import { createContext, useContext } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  /** Unique key for this line: productId[-variantId] */
  key: string;
  productId: number;
  variantId?: number | null;
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  unitPrice: number; // numeric
  quantity: number;
  imageUrl?: string | null;
  /** Variant options snapshot e.g. { color: "Red", size: "XL" } */
  options?: Record<string, string> | null;
}

export interface CartState {
  items: CartItem[];
  /** Whether the cart drawer is open */
  drawerOpen: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "key"> }
  | { type: "REMOVE_ITEM"; key: string }
  | { type: "UPDATE_QTY"; key: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "OPEN_DRAWER" }
  | { type: "CLOSE_DRAWER" }
  | { type: "SYNC_ITEMS"; items: CartItem[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildCartKey(
  productId: number,
  variantId?: number | null,
): string {
  return variantId ? `${productId}-${variantId}` : `${productId}`;
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const key = buildCartKey(
        action.payload.productId,
        action.payload.variantId,
      );
      const existing = state.items.find((i) => i.key === key);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.key === key
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i,
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, key }],
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.key !== action.key),
      };
    case "UPDATE_QTY":
      if (action.quantity < 1) {
        return {
          ...state,
          items: state.items.filter((i) => i.key !== action.key),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.key === action.key ? { ...i, quantity: action.quantity } : i,
        ),
      };
    case "CLEAR_CART":
      return { ...state, items: [] };
    case "OPEN_DRAWER":
      return { ...state, drawerOpen: true };
    case "CLOSE_DRAWER":
      return { ...state, drawerOpen: false };
    case "SYNC_ITEMS":
      return { ...state, items: action.items };
    default:
      return state;
  }
}

export const initialCartState: CartState = { items: [], drawerOpen: false };

// ─── Context ──────────────────────────────────────────────────────────────────

export interface CartContextValue {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  /** True once localStorage has been read on mount */
  hydrated: boolean;
  /** Derived totals */
  itemCount: number;
  subtotal: number;
  /** Convenience helpers */
  addItem: (item: Omit<CartItem, "key">) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, quantity: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}
