"use client";

import { useState } from "react";
import { ArrowRight, BellRing, Coffee, Leaf } from "lucide-react";
import { MenuGrid } from "@/components/menu/MenuGrid";
import { Button } from "@/components/ui/button";
import { CAFE } from "@/lib/config";
import { buildWaiterMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type TableOrderingExperienceProps = {
  tableId: string;
  tableNumber: string;
  qrToken?: string;
  tableSession?: string;
  offlineMode?: boolean;
  tenantSlug?: string;
};

export function TableOrderingExperience({
  tableId,
  tableNumber,
  qrToken,
  tableSession,
  offlineMode = false,
  tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || "apna-cafe",
}: TableOrderingExperienceProps) {
  const [started, setStarted] = useState(false);
  const waiterHref = buildWhatsAppUrl(buildWaiterMessage(tableNumber));

  if (started || qrToken || tableSession || offlineMode) {
    return (
      <main className="min-h-[100svh] bg-[#fff8e7]">
        <MenuGrid
          tableId={tableId}
          tableNumber={tableNumber}
          qrToken={qrToken}
          tableSession={tableSession}
          offlineMode={offlineMode}
          tenantSlug={tenantSlug}
          allowOrdering
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[radial-gradient(ellipse_at_top,#8e5c37_0%,#6b4226_48%,#402516_100%)] px-5 py-10 text-[#fff8e7]">
      <section className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-white/30 bg-[#fff8e7] text-[#6b4226] shadow-2xl">
          <Coffee aria-hidden="true" size={48} />
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.32em] text-[#edc978]">
          {CAFE.tagline}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-wide">
          {CAFE.name}
        </h1>
        <p className="mt-3 text-sm text-white/75">Aapka apna cafe adda</p>
        <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-[#2e7d32] px-4 py-2 text-sm font-semibold text-white">
          <Leaf aria-hidden="true" size={16} />
          100% Pure Veg
        </div>
        <p className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-6 py-4 text-lg font-semibold shadow-lg backdrop-blur">
          <span aria-hidden="true">🍽️</span>
          Table {tableNumber}
        </p>
        <Button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-8 h-14 w-full rounded-2xl bg-[#e6b849] text-lg font-bold text-[#402516] shadow-lg hover:bg-[#f0ca6c]"
        >
          View menu <ArrowRight aria-hidden="true" />
        </Button>
        {waiterHref ? (
          <a
            href={waiterHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium text-white underline decoration-white/50 underline-offset-4 hover:decoration-white"
          >
            <BellRing aria-hidden="true" size={16} />
            Call waiter on WhatsApp
          </a>
        ) : (
          <p className="mt-5 text-xs text-white/65">
            Set the cafe WhatsApp number to enable waiter requests.
          </p>
        )}
      </section>
    </main>
  );
}
