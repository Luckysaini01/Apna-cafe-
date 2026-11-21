"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QrTableOrderExperience } from "@/components/menu/QrTableOrderExperience";
import { TableSelector } from "@/components/menu/TableSelector";

function OrderPageContent() {
  const searchParams = useSearchParams();
  const qrToken = searchParams.get("t");
  const tenantSlug = searchParams.get("s") || process.env.NEXT_PUBLIC_TENANT_SLUG || "apna-cafe";
  const tableNumber = searchParams.get("table")?.trim() || undefined;

  if (qrToken) {
    return <QrTableOrderExperience qrToken={qrToken} tenantSlug={tenantSlug} />;
  }

  return <TableSelector tenantSlug={tenantSlug} initialTableNumber={tableNumber} />;
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#fff8e7] text-[#402516]">Loading menu…</div>}>
      <OrderPageContent />
    </Suspense>
  );
}
