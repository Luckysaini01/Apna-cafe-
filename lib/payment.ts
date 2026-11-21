import QRCode from "qrcode";

export type PaymentDetails = {
  upiId: string;
  name: string;
  amount: number;
  orderId: string;
};

export function buildUpiUri({ upiId, name, amount, orderId }: PaymentDetails) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: `Order #${orderId}`,
  });

  return `upi://pay?${params.toString()}`;
}

export async function generateUpiQrDataUrl(details: PaymentDetails) {
  return QRCode.toDataURL(buildUpiUri(details), {
    margin: 1,
    width: 220,
    color: {
      dark: "#402516",
      light: "#FFFFFF",
    },
  });
}
