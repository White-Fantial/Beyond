"use client";

/**
 * Cart Context — client-side cart state management.
 *
 * Provides a lightweight cart store backed by React Context.
 * Types are designed to map directly to future DB cart_sessions persistence.
 *
 * TODO: Persist cart to sessionStorage or server-side cart_sessions table.
 */

import React, { createContext, useContext, useReducer, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectedModifier {
  modifierGroupId: string;
  modifierGroupName: string;
  optionId: string;
  optionName: string;
  priceDeltaAmount: number;
}

export interface CartItem {
  /** Internal catalog product ID */
  productId: string;
  displayName: string;
  unitPrice: number;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  imageUrl?: string;
  /** Future: per-item customer notes */
  notes?: string;
}

export interface CartState {
  storeId: string;
  items: CartItem[];
  pickupTime: Date | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string; modifierKey: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; modifierKey: string; quantity: number } }
  | { type: "SET_PICKUP_TIME"; payload: Date }
  | { type: "CLEAR_CART" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a stable key for a cart item based on product ID and selected modifiers.
 * Two items with the same product but different modifier selections are distinct.
 */
export function cartItemKey(
  productId: string,
  selectedModifiers: SelectedModifier[]
): string {
  const modKey = selectedModifiers
    .map((m) => `${m.optionId}`)
    .sort()
    .join(",");
  return `${productId}:${modKey}`;
}

function getItemKey(item: CartItem): string {
  return cartItemKey(item.productId, item.selectedModifiers);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const key = getItemKey(action.payload);
      const existing = state.items.find(
        (i) => getItemKey(i) === key
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            getItemKey(i) === key
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }

    case "REMOVE_ITEM": {
      return {
        ...state,
        items: state.items.filter(
          (i) =>
            !(
              i.productId === action.payload.productId &&
              getItemKey(i) === action.payload.modifierKey
            )
        ),
      };
    }

    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) =>
              !(
                i.productId === action.payload.productId &&
                getItemKey(i) === action.payload.modifierKey
              )
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.payload.productId &&
          getItemKey(i) === action.payload.modifierKey
            ? { ...i, quantity: action.payload.quantity }
            : i
        ),
      };
    }

    case "SET_PICKUP_TIME":
      return { ...state, pickupTime: action.payload };

    case "CLEAR_CART":
      return { ...state, items: [], pickupTime: null };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CartContextValue {
  state: CartState;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, modifierKey: string) => void;
  updateQuantity: (productId: string, modifierKey: string, quantity: number) => void;
  setPickupTime: (time: Date) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({
  children,
  storeId,
  initialPickupTime,
}: {
  children: React.ReactNode;
  storeId: string;
  initialPickupTime?: Date;
}) {
  const [state, dispatch] = useReducer(cartReducer, {
    storeId,
    items: [],
    pickupTime: initialPickupTime ?? null,
  });

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: "ADD_ITEM", payload: item });
  }, []);

  const removeItem = useCallback((productId: string, modifierKey: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { productId, modifierKey } });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, modifierKey: string, quantity: number) => {
      dispatch({ type: "UPDATE_QUANTITY", payload: { productId, modifierKey, quantity } });
    },
    []
  );

  const setPickupTime = useCallback((time: Date) => {
    dispatch({ type: "SET_PICKUP_TIME", payload: time });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = state.items.reduce(
    (sum, i) =>
      sum +
      i.quantity *
        (i.unitPrice +
          i.selectedModifiers.reduce((ms, m) => ms + m.priceDeltaAmount, 0)),
    0
  );

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        setPickupTime,
        clearCart,
        totalItems,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
