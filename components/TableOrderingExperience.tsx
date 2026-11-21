"use client";

import { useState } from "react";
import { MenuWithCart } from "@/components/MenuWithCart";
import { TableWelcome } from "@/components/TableWelcome";
import { buildWaiterMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type TableOrderingExperienceProps = {
  tableId: string;
  tableNumber: string;
};

export function TableOrderingExperience({
  tableId,
  tableNumber,
}: TableOrderingExperienceProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const waiterHref = buildWhatsAppUrl(buildWaiterMessage(tableNumber));

  if (!hasStarted) {
    return (
      <TableWelcome
        tableNumber={tableNumber}
        waiterHref={waiterHref}
        onViewMenu={() => setHasStarted(true)}
      />
    );
  }

  return (
    <MenuWithCart
      tableId={tableId}
      tableNumber={tableNumber}
      onBack={() => setHasStarted(false)}
    />
  );
}
