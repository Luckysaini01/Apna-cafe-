"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getMenuItem, type MenuItem } from "@/lib/menu";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  sku?: string;
};

type CartStore = {
  carts: Record<string, CartItem[]>;
  addItem: (tableId: string, item: MenuItem) => void;
  syncItems: (tableId: string, items: MenuItem[]) => void;
  removeItem: (tableId: string, itemId: string) => void;
  clearCart: (tableId: string) => void;
};

const EMPTY_CART: CartItem[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeCarts(value: unknown): Record<string, CartItem[]> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([tableId, storedItems]) => {
      if (!Array.isArray(storedItems)) return [tableId, EMPTY_CART];

      const items = storedItems.flatMap((storedItem) => {
        if (!isRecord(storedItem)) return [];

        const id = storedItem.id;
        const qty = storedItem.qty;
        if (
          typeof id !== "string" ||
          typeof qty !== "number" ||
          !Number.isInteger(qty) ||
          qty < 1
        ) {
          return [];
        }

        const staticItem = getMenuItem(id);
        const name = typeof storedItem.name === "string" ? storedItem.name : staticItem?.name;
        const price =
          typeof storedItem.price === "number" && Number.isFinite(storedItem.price)
            ? storedItem.price
            : staticItem?.price;
        if (name === undefined || price === undefined) return [];

        const sku =
          typeof storedItem.sku === "string"
            ? storedItem.sku
            : staticItem
              ? id
              : undefined;

        return [{ id, name, price, qty, ...(sku ? { sku } : {}) }];
      });

      return [tableId, items];
    }),
  );
}

export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      carts: {},
      addItem: (tableId, menuItem) => {
        set((state) => {
          const currentItems = state.carts[tableId] ?? EMPTY_CART;
          const existing = currentItems.find((item) => item.id === menuItem.id);
          const items = existing
            ? currentItems.map((item) =>
                item.id === menuItem.id
                  ? { ...item, name: menuItem.name, price: menuItem.price, qty: item.qty + 1 }
                  : item,
              )
            : [
                ...currentItems,
                {
                  id: menuItem.id,
                  name: menuItem.name,
                  price: menuItem.price,
                  qty: 1,
                  ...(menuItem.source === "database" ? {} : { sku: menuItem.id }),
                },
              ];

          return { carts: { ...state.carts, [tableId]: items } };
        });
      },
      syncItems: (tableId, menuItems) =>
        set((state) => {
          const currentItems = state.carts[tableId] ?? EMPTY_CART;
          if (currentItems.length === 0) return state;

          const currentMenu = new Map(menuItems.map((item) => [item.id, item] as const));
          const items = currentItems.map((item) => {
            const menuItem = currentMenu.get(item.id);
            return menuItem
              ? { ...item, name: menuItem.name, price: menuItem.price }
              : item;
          });

          return { carts: { ...state.carts, [tableId]: items } };
        }),
      removeItem: (tableId, itemId) =>
        set((state) => {
          const currentItems = state.carts[tableId] ?? EMPTY_CART;
          const existing = currentItems.find((item) => item.id === itemId);
          if (!existing) return state;

          const items =
            existing.qty === 1
              ? currentItems.filter((item) => item.id !== itemId)
              : currentItems.map((item) =>
                  item.id === itemId ? { ...item, qty: item.qty - 1 } : item,
                );

          return { carts: { ...state.carts, [tableId]: items } };
        }),
      clearCart: (tableId) =>
        set((state) => {
          const carts = { ...state.carts };
          delete carts[tableId];
          return { carts };
        }),
    }),
    {
      name: "apna-cafe-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const persisted = isRecord(persistedState) ? persistedState : {};
        return {
          ...currentState,
          carts: sanitizeCarts(persisted.carts),
        };
      },
    },
  ),
);
