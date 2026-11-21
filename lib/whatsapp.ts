import { CAFE } from "@/lib/config";
import type { CartItem } from "@/stores/cart";

function getWhatsAppNumber() {
  return CAFE.whatsapp.replace(/\D/g, "");
}

export function isWhatsAppConfigured() {
  return /^\d{10,15}$/.test(getWhatsAppNumber());
}

export function buildWhatsAppUrl(message: string) {
  const phone = getWhatsAppNumber();
  if (!/^\d{10,15}$/.test(phone)) return null;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildOrderMessage(tableNumber: string, items: CartItem[]) {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemLines = items
    .map((item) => `• ${item.qty}x ${item.name} — ₹${item.price * item.qty}`)
    .join("\n");
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    `🍽️ *${CAFE.name} — New Order*\n\n` +
    `📍 Table: ${tableNumber}\n` +
    `🕐 Time: ${time}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `*Total: ₹${total}*\n\n` +
    `---\nSent from apnacafe.in`
  );
}

export function buildPlacedOrderMessage(
  tableNumber: string,
  order: {
    orderNumber: number;
    total: number | string;
    items: { nameSnapshot: string; priceSnapshot: number | string; quantity: number }[];
  },
) {
  const itemLines = order.items
    .map((item) => {
      const lineTotal = Number(item.priceSnapshot) * item.quantity;
      return `• ${item.quantity}x ${item.nameSnapshot} — ₹${lineTotal.toFixed(2)}`;
    })
    .join("\n");
  const total = Number(order.total).toFixed(2);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    `🍽️ *${CAFE.name} — New Order #${order.orderNumber}*\n\n` +
    `📍 Table: ${tableNumber}\n` +
    `🕐 Time: ${time}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `*Total: ₹${total}*\n\n` +
    `---\nSent from apnacafe.in`
  );
}

export function buildWaiterMessage(tableNumber: string) {
  return `Table ${tableNumber} se waiter bula rahe hain 🙋`;
}
