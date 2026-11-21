"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { CartItem } from "@/components/cart/CartItem";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/menu";
import { buildUpiUri, generateUpiQrDataUrl } from "@/lib/payment";
import {
  buildOrderMessage,
  buildPlacedOrderMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import type { CartItem as CartEntry } from "@/stores/cart";

const API_URL = (process.env.NEXT_PUBLIC_DINE_OS_API_URL || "http://localhost:4000").replace(/\/+$/, "");

function formatPaymentAmount(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: string;
  qrToken?: string;
  tableSession?: string;
  tenantSlug?: string;
  items: CartEntry[];
  subtotal: number;
  taxAmount: number;
  taxPercent: number;
  total: number;
  onAdd: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
  onOrderPlaced: () => void;
};

export function CartDrawer({
  open,
  onOpenChange,
  tableNumber,
  qrToken,
  tableSession,
  tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || "apna-cafe",
  items,
  subtotal,
  taxAmount,
  taxPercent,
  total,
  onAdd,
  onRemove,
  onClear,
  onOrderPlaced,
}: CartDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{
    orderNumber: number;
    total: number;
    upiUri: string | null;
    upiQrDataUrl: string | null;
    whatsappHref: string | null;
    whatsappOpened: boolean;
  } | null>(null);
  const orderHref =
    items.length > 0
      ? buildWhatsAppUrl(buildOrderMessage(tableNumber, items))
      : null;
  const hasOrderContext = Boolean(qrToken || tableSession);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setPlacedOrder(null);
    onOpenChange(nextOpen);
  }

  async function handlePlaceOrder() {
    if (!hasOrderContext && !orderHref) {
      toast.error("Set the cafe WhatsApp number in .env.local first.");
      return;
    }

    if (!hasOrderContext) {
      if (!orderHref) return;
      window.open(orderHref, "_blank", "noopener,noreferrer");
      return;
    }

    if (isSubmitting || placedOrder) return;

    const whatsappWindow = orderHref ? window.open("about:blank", "_blank") : null;
    if (whatsappWindow) whatsappWindow.opener = null;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/v1/public/${encodeURIComponent(tenantSlug)}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(qrToken ? { qrToken } : { tableSession }),
          items: items.map((item) => ({
            ...(item.sku ? { sku: item.sku } : { menuItemId: item.id }),
            quantity: item.qty,
          })),
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        order?: {
          orderNumber: number;
          total: number | string;
          items: { nameSnapshot: string; priceSnapshot: number | string; quantity: number }[];
        };
        payment?: {
          upiId: string | null;
          upiName: string | null;
          allowUpiPayment: boolean;
        };
      };

      if (!response.ok || !payload?.order) {
        throw new Error(payload?.message || "Could not place your order.");
      }

      const confirmedOrder = payload.order;
      const confirmedHref = buildWhatsAppUrl(
        buildPlacedOrderMessage(tableNumber, confirmedOrder),
      );
      const paymentDetails =
        payload.payment?.allowUpiPayment && payload.payment.upiId
          ? {
              upiId: payload.payment.upiId,
              name: payload.payment.upiName || "Apna Cafe",
              amount: Number(confirmedOrder.total),
              orderId: String(confirmedOrder.orderNumber),
            }
          : null;
      const upiUri = paymentDetails ? buildUpiUri(paymentDetails) : null;
      let upiQrDataUrl: string | null = null;

      if (paymentDetails) {
        try {
          upiQrDataUrl = await generateUpiQrDataUrl(paymentDetails);
        } catch (qrError) {
          console.error("Could not generate the customer UPI QR code.", qrError);
        }
      }

      if (confirmedHref && whatsappWindow) {
        whatsappWindow.location.href = confirmedHref;
      } else {
        whatsappWindow?.close();
      }

      setPlacedOrder({
        orderNumber: confirmedOrder.orderNumber,
        total: Number(confirmedOrder.total),
        upiUri,
        upiQrDataUrl,
        whatsappHref: confirmedHref && !whatsappWindow ? confirmedHref : null,
        whatsappOpened: Boolean(confirmedHref && whatsappWindow),
      });
      onOrderPlaced();
      toast.success(`Order #${confirmedOrder.orderNumber} placed.`);
    } catch (orderError) {
      whatsappWindow?.close();
      toast.error(orderError instanceof Error ? orderError.message : "Could not place your order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} swipeDirection="down">
      <DrawerContent className="mx-auto max-h-[88svh] w-full max-w-lg rounded-t-3xl bg-[#fffdf8]">
        <DrawerHeader className="px-5 pt-6 text-left">
          <DrawerTitle className="font-serif text-2xl font-bold text-[#402516]">
            {placedOrder ? "Order placed" : "Your cart"}
          </DrawerTitle>
          <DrawerDescription className="text-[#806b56]">
            {placedOrder
              ? `Order #${placedOrder.orderNumber} · Table ${tableNumber}`
              : `Table ${tableNumber} · Review your items before sending the order.`}
          </DrawerDescription>
        </DrawerHeader>

        {placedOrder ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
            <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
              Your order is in the cafe&apos;s admin panel. Payment will be confirmed by staff.
            </p>

            {placedOrder.upiUri ? (
              <section className="rounded-2xl border border-[#eadbc4] bg-[#fffaf2] p-4 text-center">
                <h3 className="font-bold text-[#402516]">Pay by UPI</h3>
                <p className="mt-1 text-sm text-[#60452f]">
                  Scan and pay {formatPaymentAmount(placedOrder.total)} to the cafe.
                </p>
                {placedOrder.upiQrDataUrl ? (
                  <Image
                    src={placedOrder.upiQrDataUrl}
                    alt={`UPI QR code to pay ${formatPaymentAmount(placedOrder.total)} for order ${placedOrder.orderNumber}`}
                    width={220}
                    height={220}
                    unoptimized
                    className="mx-auto mt-3 size-48 rounded-xl bg-white p-2"
                  />
                ) : null}
                <a
                  href={placedOrder.upiUri}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2e7d32] px-4 text-sm font-bold text-white hover:bg-[#225d2a]"
                >
                  Open UPI app
                </a>
              </section>
            ) : (
              <p className="rounded-xl border border-dashed border-[#d9c7ad] bg-white px-4 py-3 text-center text-sm text-[#60452f]">
                UPI is not enabled. Pay cash at the counter after your order is prepared.
              </p>
            )}
            {placedOrder.upiUri ? (
              <p className="text-center text-sm text-[#60452f]">
                Or pay cash at the counter after your order is prepared.
              </p>
            ) : null}

            {placedOrder.whatsappOpened ? (
              <p className="rounded-xl bg-[#eaf7ee] px-4 py-3 text-center text-sm text-[#245b34]">
                WhatsApp opened with your order details. Tap Send there to message the cafe.
              </p>
            ) : placedOrder.whatsappHref ? (
              <a
                href={placedOrder.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#168c4a] px-4 text-sm font-bold text-white hover:bg-[#11733c]"
              >
                Send order details on WhatsApp
              </a>
            ) : (
              <p className="text-center text-sm text-[#806b56]">
                WhatsApp is not configured. Your order is still in the admin panel.
              </p>
            )}

            <p className="text-center text-xs text-[#806b56]">
              UPI payments are not verified automatically. Staff will confirm payment in the admin panel.
            </p>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#806b56]">
            Your cart is empty. Add something from the menu.
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onAdd={() => onAdd(item.id)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </div>
        )}

        {!placedOrder && items.length > 0 && (
          <DrawerFooter className="gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-t border-[#eadbc4] pt-4 text-sm text-[#60452f]">
              <span>Subtotal</span>
              <span>{formatRupees(subtotal)}</span>
            </div>
            {taxPercent > 0 ? (
              <div className="flex items-center justify-between text-sm text-[#806b56]">
                <span>Tax ({taxPercent}%)</span>
                <span>{formatRupees(taxAmount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-[#eadbc4] pt-3 text-lg font-bold text-[#402516]">
              <span>Total ({items.reduce((count, item) => count + item.qty, 0)} items)</span>
              <span>{formatRupees(total)}</span>
            </div>
            {hasOrderContext || orderHref ? (
              <Button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="h-12 w-full bg-[#168c4a] text-base font-bold text-white hover:bg-[#11733c]"
              >
                {isSubmitting
                  ? "Sending order to cafe…"
                  : hasOrderContext
                    ? orderHref
                      ? "Place order & notify cafe"
                      : "Place order"
                    : "Place order on WhatsApp"}
              </Button>
            ) : (
              <div>
                <Button
                  type="button"
                  disabled
                  className="h-12 w-full bg-slate-300 text-base font-bold text-slate-600"
                >
                  WhatsApp number not set
                </Button>
                <p className="mt-2 text-center text-xs text-[#806b56]">
                  Add NEXT_PUBLIC_OWNER_WHATSAPP to .env.local.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={onClear}>
                Clear cart
              </Button>
              <DrawerClose
                render={
                  <Button type="button" variant="outline">
                    Keep browsing
                  </Button>
                }
              />
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
