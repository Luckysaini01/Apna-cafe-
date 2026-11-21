"use client";

import { useEffect, useState } from "react";
import { TableOrderingExperience } from "@/components/menu/TableOrderingExperience";

type TableContext = {
  table: {
    id: string;
    number: string;
  };
};

const API_URL = (process.env.NEXT_PUBLIC_DINE_OS_API_URL || "http://localhost:4000").replace(/\/+$/, "");

export function QrTableOrderExperience({
  qrToken,
  tenantSlug,
}: {
  qrToken: string;
  tenantSlug: string;
}) {
  const [tableContext, setTableContext] = useState<TableContext | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadTable() {
      try {
        const response = await fetch(
          `${API_URL}/v1/public/${encodeURIComponent(tenantSlug)}/table/${encodeURIComponent(qrToken)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || "This table QR code is invalid or inactive.");
        }

        setTableContext(payload as TableContext);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load this table.");
      }
    }

    void loadTable();
    return () => controller.abort();
  }, [qrToken, tenantSlug]);

  if (error) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#fff8e7] px-5 text-center">
        <div className="max-w-sm rounded-2xl border border-[#eadbc4] bg-white p-6">
          <h1 className="font-serif text-xl font-bold text-[#402516]">Unable to open table</h1>
          <p role="alert" className="mt-2 text-sm text-[#806b56]">{error}</p>
        </div>
      </main>
    );
  }

  if (!tableContext) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#fff8e7] text-[#60452f]">
        Loading your table menu…
      </main>
    );
  }

  return (
    <TableOrderingExperience
      tableId={tableContext.table.id}
      tableNumber={tableContext.table.number}
      qrToken={qrToken}
      tenantSlug={tenantSlug}
    />
  );
}
