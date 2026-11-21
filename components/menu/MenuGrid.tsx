"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { MenuCard } from "@/components/menu/MenuCard";
import { ItemDrawer } from "@/components/menu/ItemDrawer";
import { CartBar } from "@/components/cart/CartBar";
import { CartDrawer } from "@/components/cart/CartDrawer";
import {
  menuCategories,
  menuItems,
  type MenuCategory,
  type MenuItem,
} from "@/lib/menu";
import { useCart } from "@/stores/cart";

const EMPTY_CART: ReturnType<typeof useCart.getState>["carts"][string] = [];
const EMPTY_MENU_ITEMS: MenuItem[] = [];
const API_URL = (process.env.NEXT_PUBLIC_DINE_OS_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || "apna-cafe";

type MenuCatalog = {
  tenant: { taxPercent: number };
  categories: MenuCategory[];
  items: MenuItem[];
};

type MenuGridProps = {
  tableId?: string;
  tableNumber?: string;
  qrToken?: string;
  tableSession?: string;
  offlineMode?: boolean;
  tenantSlug?: string;
  allowOrdering?: boolean;
};

export function MenuGrid({
  tableId,
  tableNumber,
  qrToken,
  tableSession,
  offlineMode = false,
  tenantSlug,
  allowOrdering = false,
}: MenuGridProps) {
  const [catalog, setCatalog] = useState<MenuCatalog | null>(null);
  const [menuError, setMenuError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartHydrated, setCartHydrated] = useState(false);
  const cartItems = useCart((state) =>
    tableId ? state.carts[tableId] ?? EMPTY_CART : EMPTY_CART,
  );
  const addItem = useCart((state) => state.addItem);
  const syncItems = useCart((state) => state.syncItems);
  const removeItem = useCart((state) => state.removeItem);
  const clearCart = useCart((state) => state.clearCart);
  const resolvedTenantSlug = tenantSlug ?? DEFAULT_TENANT_SLUG;

  useEffect(() => {
    let active = true;
    const unsubscribe = useCart.persist.onFinishHydration(() => {
      if (active) setCartHydrated(true);
    });

    if (useCart.persist.hasHydrated()) {
      void Promise.resolve().then(() => {
        if (active) setCartHydrated(true);
      });
    } else {
      void Promise.resolve(useCart.persist.rehydrate()).then(
        () => {
          if (active) setCartHydrated(true);
        },
        (error: unknown) => {
          console.error("Could not restore the saved cart.", error);
          if (active) setCartHydrated(true);
        },
      );
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMenu() {
      try {
        const response = await fetch(
          `${API_URL}/v1/public/${encodeURIComponent(resolvedTenantSlug)}/menu`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load the live menu.");
        }

        setCatalog(payload as MenuCatalog);
        setMenuError("");
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setMenuError(
          requestError instanceof Error ? requestError.message : "Unable to load the live menu.",
        );
      }
    }

    void loadMenu();
    const refreshInterval = window.setInterval(() => void loadMenu(), 15_000);
    return () => {
      window.clearInterval(refreshInterval);
      controller.abort();
    };
  }, [resolvedTenantSlug]);

  useEffect(() => {
    if (tableId && catalog) syncItems(tableId, catalog.items);
  }, [catalog, syncItems, tableId]);

  const categories = catalog?.categories ?? menuCategories;
  const selectedCategory =
    activeCategory === "all" || categories.some((category) => category.id === activeCategory)
      ? activeCategory
      : "all";
  const sourceItems = catalog?.items ?? (!allowOrdering ? menuItems : EMPTY_MENU_ITEMS);
  const items = useMemo(
    () =>
      selectedCategory === "all"
        ? sourceItems
        : sourceItems.filter((item) => item.category === selectedCategory),
    [selectedCategory, sourceItems],
  );
  const itemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const subtotalPaise = cartItems.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.qty,
    0,
  );
  const subtotal = subtotalPaise / 100;
  const taxPercent = catalog?.tenant.taxPercent ?? 0;
  const taxAmount = Math.round((subtotalPaise * taxPercent) / 100) / 100;
  const total = subtotal + taxAmount;

  function handleAdd(itemId: string) {
    if (!tableId) return;
    const item = items.find((menuItem) => menuItem.id === itemId);
    if (!item) return;
    addItem(tableId, item);
    toast.success("Added to your cart");
  }

  function handleRemove(itemId: string) {
    if (!tableId) return;
    removeItem(tableId, itemId);
  }

  function handleClearCart() {
    if (!tableId) return;
    clearCart(tableId);
    setCartOpen(false);
    toast.success("Cart cleared");
  }

  function handleOrderPlaced() {
    if (!tableId) return;
    clearCart(tableId);
  }

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a06a3f]">
              Made fresh at Apna Cafe
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-[#402516] sm:text-4xl">
              {allowOrdering ? "Order for your table" : "Our menu"}
            </h1>
          </div>
          {tableNumber && (
            <span className="w-fit rounded-full bg-[#f1e5d3] px-4 py-2 text-sm font-bold text-[#60452f]">
              Table {tableNumber}
            </span>
          )}
        </div>

        {allowOrdering && offlineMode ? (
          <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Database is unavailable. Orders can be sent through WhatsApp only and will not appear in the admin panel.
          </p>
        ) : allowOrdering && !qrToken && !tableSession ? (
          <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No active table session was found. Return to /order and choose an active table before placing an order.
          </p>
        ) : null}
        {menuError ? (
          <p
            role={allowOrdering ? "alert" : "status"}
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {allowOrdering
              ? `Unable to load the live menu: ${menuError}`
              : `Live menu unavailable; showing the saved menu. ${menuError}`}
          </p>
        ) : null}
        {allowOrdering && !catalog && !menuError ? (
          <p role="status" className="mb-5 text-sm text-[#806b56]">
            Loading menu items…
          </p>
        ) : null}

        <CategoryTabs
          activeCategory={selectedCategory}
          onChange={setActiveCategory}
          categories={categories}
        />

        {items.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const currentQuantity =
                cartItems.find((cartItem) => cartItem.id === item.id)?.qty ?? 0;

              return (
                <MenuCard
                  key={item.id}
                  item={item}
                  quantity={currentQuantity}
                  allowOrdering={allowOrdering && cartHydrated}
                  onAdd={() => handleAdd(item.id)}
                  onRemove={() => handleRemove(item.id)}
                  onView={() => setSelectedItem(item)}
                />
              );
            })}
          </div>
        ) : catalog || menuError ? (
          <p className="mt-8 rounded-xl border border-dashed border-[#d9c7ad] px-4 py-8 text-center text-sm text-[#806b56]">
            {menuError && allowOrdering
              ? "The live menu could not be loaded."
              : "No available menu items yet."}
          </p>
        ) : null}

        {allowOrdering && !cartHydrated && (
          <p className="mt-5 text-center text-sm text-[#806b56]" role="status">
            Restoring your saved cart…
          </p>
        )}

        {allowOrdering && cartHydrated && itemCount === 0 && (
          <p className="mt-6 text-center text-sm text-[#806b56]">
            Add an item to start your order.
          </p>
        )}
      </section>

      {allowOrdering && tableId && cartHydrated && itemCount > 0 && (
        <CartBar
          count={itemCount}
          total={total}
          onClick={() => setCartOpen(true)}
        />
      )}

      {allowOrdering && tableId && (
        <CartDrawer
          open={cartOpen}
          onOpenChange={setCartOpen}
          tableNumber={tableNumber ?? tableId}
          qrToken={qrToken}
          tableSession={tableSession}
          tenantSlug={resolvedTenantSlug}
          items={cartItems}
          subtotal={subtotal}
          taxAmount={taxAmount}
          taxPercent={taxPercent}
          total={total}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onClear={handleClearCart}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      <ItemDrawer
        item={selectedItem}
        canOrder={allowOrdering && Boolean(tableId) && cartHydrated}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        onAdd={handleAdd}
      />
    </>
  );
}
