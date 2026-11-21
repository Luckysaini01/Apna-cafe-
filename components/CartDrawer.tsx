"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { CartItem } from "@/lib/cart";
import { buildUpiUri, generateUpiQrDataUrl } from "@/lib/payment";
import { WhatsAppOrderButton } from "@/components/WhatsAppOrderButton";

type CartDrawerProps = {
  items: CartItem[];
  total: number;
  orderHref: string | null;
  onClose: () => void;
  onClear: () => void;
  onAdd: (itemId: string) => void;
  onRemove: (itemId: string) => void;
};

function formatRupees(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function CartDrawer({
  items,
  total,
  orderHref,
  onClose,
  onClear,
  onAdd,
  onRemove,
}: CartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash">("upi");
  const [upiQr, setUpiQr] = useState<string>("");
  const upiPayment = useMemo(() => {
    const cartReference = items.map((item) => `${item.id}-${item.qty}`).join("-");
    return {
      upiId: process.env.NEXT_PUBLIC_UPI_ID || "apnacafe@upi",
      name: process.env.NEXT_PUBLIC_UPI_NAME || "Apna Cafe",
      amount: total,
      orderId: `APNA-${cartReference || "EMPTY"}`,
    };
  }, [items, total]);
  const upiUrl = items.length > 0 ? buildUpiUri(upiPayment) : "";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (items.length === 0) return;

    let active = true;

    void generateUpiQrDataUrl(upiPayment)
      .then((dataUrl) => {
        if (active) setUpiQr(dataUrl);
      })
      .catch(() => {
        if (active) setUpiQr("");
      });

    return () => {
      active = false;
    };
  }, [items.length, upiPayment]);

  const paymentSummary = useMemo(() => {
    if (items.length === 0) return null;

    return (
      <div className="mt-5 rounded-2xl border border-[#eadbc4] bg-[#fffaf2] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06a3f]">Payment</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("upi")}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${
              paymentMethod === "upi"
                ? "border-[#6b4226] bg-[#6b4226] text-white"
                : "border-[#d9c7ad] bg-white text-[#60452f]"
            }`}
          >
            UPI
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${
              paymentMethod === "cash"
                ? "border-[#6b4226] bg-[#6b4226] text-white"
                : "border-[#d9c7ad] bg-white text-[#60452f]"
            }`}
          >
            Cash
          </button>
        </div>

        {paymentMethod === "upi" ? (
          <div className="mt-4 space-y-3">
            {upiQr ? (
              <div className="flex justify-center rounded-2xl bg-white p-3 shadow-inner">
                <Image src={upiQr} alt="UPI QR code" width={160} height={160} unoptimized className="h-40 w-40 rounded-xl" />
              </div>
            ) : null}

            <div className="rounded-xl border border-dashed border-[#d9c7ad] bg-white px-3 py-2 text-sm text-[#60452f]">
              Pay {formatRupees(total)} to <span className="font-bold">Apna Cafe</span>
            </div>

            <a
              href={upiUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2e7d32] px-4 text-sm font-bold text-white hover:bg-[#225d2a]"
            >
              Open UPI app
            </a>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[#d9c7ad] bg-white px-3 py-3 text-sm text-[#60452f]">
            Pay cash at the counter after your order is prepared.
          </div>
        )}
      </div>
    );
  }, [items.length, paymentMethod, total, upiQr, upiUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#21150e]/55 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="cart-title"
        aria-modal="true"
        className="max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#fffdf8] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7"
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06a3f]">
              Ready when you are
            </p>
            <h2 id="cart-title" className="mt-1 text-2xl font-bold text-[#402516]">
              Your cart
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close cart"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-[#f3eadc] text-2xl text-[#60452f] transition hover:bg-[#eadbc4]"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-[#f8f1e7] px-5 py-10 text-center">
            <p className="text-3xl" aria-hidden="true">
              🛒
            </p>
            <p className="mt-3 font-semibold text-[#60452f]">
              Your cart is empty
            </p>
            <p className="mt-1 text-sm text-[#8b7967]">
              Add something delicious from the menu.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b border-[#eee2d0] pb-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#402516]">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-[#8b7967]">
                      {formatRupees(item.price)} each
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Remove one ${item.name}`}
                      onClick={() => onRemove(item.id)}
                      className="flex size-9 items-center justify-center rounded-full border border-[#d9c7ad] text-lg font-semibold text-[#60452f] hover:bg-[#f8f1e7]"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold text-[#402516]">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${item.name}`}
                      onClick={() => onAdd(item.id)}
                      className="flex size-9 items-center justify-center rounded-full bg-[#6b4226] text-lg font-semibold text-white hover:bg-[#4a2d19]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-[#e7d9c6] pt-5 text-lg font-bold text-[#402516]">
              <span>Total</span>
              <span>{formatRupees(total)}</span>
            </div>

            {paymentSummary}

            <div className="mt-5 space-y-3">
              <WhatsAppOrderButton href={orderHref} />
              <a
                href={upiUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#6b4226] px-4 text-sm font-bold text-[#6b4226] hover:bg-[#f8f1e7]"
              >
                Pay with UPI now
              </a>
            </div>

            <button
              type="button"
              onClick={onClear}
              className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-[#9a4333] hover:bg-[#fbf0ec]"
            >
              Clear cart
            </button>
          </>
        )}
      </section>
    </div>
  );
}
