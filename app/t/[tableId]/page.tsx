"use client";

import { Suspense } from "react";
import { notFound, useParams } from "next/navigation";
import { TableSelector } from "@/components/menu/TableSelector";

function TablePageContent() {
  const params = useParams<{ tableId?: string }>();
  const tableId = typeof params?.tableId === "string" ? params.tableId : "";
  const match = /^table([1-4])$/.exec(tableId);

  if (!match) {
    notFound();
    return null;
  }

  return <TableSelector tenantSlug={process.env.NEXT_PUBLIC_TENANT_SLUG || "apna-cafe"} initialTableNumber={match[1]} />;
}

export default function TablePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#fff8e7] text-[#402516]">Loading table...</div>}>
      <TablePageContent />
    </Suspense>
  );
}
