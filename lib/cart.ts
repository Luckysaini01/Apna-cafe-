import menuData from "@/data/menu.json";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

const CART_KEY_PREFIX = "apna_cafe_cart";

function getStorageKey(tableId: string) {
  return `${CART_KEY_PREFIX}:${tableId}`;
}

function isStoredCartItem(value: unknown): value is { id: string; qty: number } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    Number.isInteger(item.qty) &&
    Number(item.qty) > 0
  );
}

export function loadCart(tableId: string): CartItem[] {
  if (typeof window === "undefined") return [];

  let stored: string | null;
  try {
    stored = window.localStorage.getItem(getStorageKey(tableId));
  } catch (error) {
    console.error("Unable to read the saved cart from localStorage.", error);
    return [];
  }

  if (!stored) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored) as unknown;
  } catch (error) {
    console.error("The saved cart contains invalid JSON.", error);
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.error("The saved cart has an invalid format.");
    return [];
  }

  const validItems = parsed.filter(isStoredCartItem);
  const cart = validItems.flatMap((storedItem) => {
    const menuItem = menuData.items.find((item) => item.id === storedItem.id);
    return menuItem
      ? [
          {
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            qty: storedItem.qty,
          },
        ]
      : [];
  });

  if (cart.length !== parsed.length) {
    console.warn("Invalid or outdated saved cart items were ignored.");
  }

  return cart;
}

export function saveCart(tableId: string, cart: CartItem[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(tableId), JSON.stringify(cart));
  } catch (error) {
    console.error("Unable to save the cart to localStorage.", error);
  }
}

export function clearCart(tableId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(getStorageKey(tableId));
  } catch (error) {
    console.error("Unable to clear the saved cart from localStorage.", error);
  }
}
