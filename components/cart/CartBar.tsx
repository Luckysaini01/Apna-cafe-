"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/menu";

type CartBarProps = {
  count: number;
  total: number;
  onClick: () => void;
};

export function CartBar({ count, total, onClick }: CartBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eadbc4] bg-[#fffaf0]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(74,45,25,0.12)] backdrop-blur">
      <Button
        type="button"
        onClick={onClick}
        className="mx-auto flex h-14 w-full max-w-6xl justify-between rounded-2xl bg-[#6b4226] px-5 text-white hover:bg-[#4a2d19]"
      >
        <span className="inline-flex items-center gap-2 font-semibold">
          <ShoppingBag aria-hidden="true" size={18} />
          {count} item{count === 1 ? "" : "s"}
        </span>
        <span className="font-bold">{formatRupees(total)}</span>
        <span className="font-semibold">View cart →</span>
      </Button>
    </div>
  );
}
