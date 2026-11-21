"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import menuData from "@/data/menu.json";
import { CartDrawer } from "@/components/CartDrawer";
import { MenuItemPhoto } from "@/components/menu/MenuItemPhoto";
import { clearCart, loadCart, saveCart, type CartItem } from "@/lib/cart";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type MenuWithCartProps = {
  tableId: string;
  tableNumber: string;
  onBack: () => void;
};

function formatRupees(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function MenuWithCart({
  tableId,
  tableNumber,
  onBack,
}: MenuWithCartProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadedTableId, setLoadedTableId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setCart(loadCart(tableId));
      setLoadedTableId(tableId);
    });

    return () => {
      active = false;
    };
  }, [tableId]);

  useEffect(() => {
    if (loadedTableId === tableId) saveCart(tableId, cart);
  }, [cart, loadedTableId, tableId]);

  const visibleItems = useMemo(
    () =>
      selectedCategory === "all"
        ? menuData.items
        : menuData.items.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const orderHref =
    cart.length > 0
      ? buildWhatsAppUrl(buildOrderMessage(tableNumber, cart))
      : null;

  const addItem = useCallback((itemId: string) => {
    const menuItem = menuData.items.find((item) => item.id === itemId);
    if (!menuItem) return;

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === itemId);
      if (existing) {
        return currentCart.map((item) =>
          item.id === itemId ? { ...item, qty: item.qty + 1 } : item,
        );
      }

      return [
        ...currentCart,
        {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          qty: 1,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === itemId);
      if (!existing) return currentCart;
      if (existing.qty <= 1) {
        return currentCart.filter((item) => item.id !== itemId);
      }

      return currentCart.map((item) =>
        item.id === itemId ? { ...item, qty: item.qty - 1 } : item,
      );
    });
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
    clearCart(tableId);
    setIsCartOpen(false);
  }, [tableId]);

  return (
    <main className="min-h-[100svh] bg-[#fff8e7] pb-28">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#4a2d19] text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to welcome screen"
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20"
            >
              ←
            </button>
            <div>
              <p className="font-serif text-lg font-bold">Apna Cafe</p>
              <p className="text-xs text-[#edc978]">Table {tableNumber}</p>
            </div>
          </div>
          <span className="rounded-full bg-[#2e7d32] px-3 py-1.5 text-xs font-semibold">
            🌱 Pure Veg
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-2 pt-7 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#a06a3f]">
          Freshly made, just for you
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-[#402516] sm:text-4xl">
          What are you craving?
        </h1>
        <p className="mt-2 text-sm text-[#806b56]">
          Pick your favourites and we&apos;ll send your order to the cafe.
        </p>
      </section>

      <nav
        aria-label="Menu categories"
        className="sticky top-[65px] z-20 mt-5 border-b border-[#eadbc4] bg-[#fff8e7]/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <button
            type="button"
            aria-pressed={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              selectedCategory === "all"
                ? "border-[#6b4226] bg-[#6b4226] text-white shadow-sm"
                : "border-[#d7c3a9] bg-white text-[#60452f] hover:border-[#6b4226]"
            }`}
          >
            🍽️ All
          </button>
          {menuData.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedCategory === category.id
                  ? "border-[#6b4226] bg-[#6b4226] text-white shadow-sm"
                  : "border-[#d7c3a9] bg-white text-[#60452f] hover:border-[#6b4226]"
              }`}
            >
              <span aria-hidden="true">{category.icon}</span>{" "}
              {category.name}
            </button>
          ))}
        </div>
      </nav>

      <section
        aria-label="Menu items"
        className="mx-auto grid max-w-5xl grid-cols-2 gap-3 px-4 py-5 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4"
      >
        {visibleItems.map((item) => {
          const cartItem = cart.find((entry) => entry.id === item.id);

          return (
            <article
              key={item.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#eadbc4] bg-white shadow-[0_6px_20px_rgba(74,45,25,0.06)]"
            >
              <div className="relative">
                <MenuItemPhoto item={item} className="h-28 w-full sm:h-32" />
                {item.best && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#e6b849] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#402516]">
                    Best seller
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[#402516]">
                  {item.name}
                </h2>
                <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-4 text-[#8b7967]">
                  {item.desc}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="font-bold text-[#6b4226]">
                    {formatRupees(item.price)}
                  </span>
                  {cartItem ? (
                    <div className="flex items-center gap-2 rounded-xl bg-[#6b4226] px-1.5 py-1 text-white">
                      <button
                        type="button"
                        aria-label={`Remove one ${item.name}`}
                        onClick={() => removeItem(item.id)}
                        className="flex size-7 items-center justify-center rounded-lg text-lg hover:bg-white/15"
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center text-sm font-bold">
                        {cartItem.qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${item.name}`}
                        onClick={() => addItem(item.id)}
                        className="flex size-7 items-center justify-center rounded-lg text-lg hover:bg-white/15"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addItem(item.id)}
                      className="min-h-9 rounded-xl bg-[#6b4226] px-3 text-xs font-bold text-white transition hover:bg-[#4a2d19] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b4226]"
                    >
                      ADD
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {count > 0 && !isCartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eadbc4] bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(74,45,25,0.12)] backdrop-blur">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-3 rounded-2xl bg-[#6b4226] px-4 text-white transition hover:bg-[#4a2d19] sm:px-6"
          >
            <span className="text-sm font-semibold">
              🛒 {count} item{count === 1 ? "" : "s"}
            </span>
            <span className="font-bold">{formatRupees(total)}</span>
            <span className="text-sm font-semibold">View cart →</span>
          </button>
        </div>
      )}

      {isCartOpen && (
        <CartDrawer
          items={cart}
          total={total}
          orderHref={orderHref}
          onClose={() => setIsCartOpen(false)}
          onClear={handleClearCart}
          onAdd={addItem}
          onRemove={removeItem}
        />
      )}
    </main>
  );
}
