import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/menu";
import type { CartItem as CartEntry } from "@/stores/cart";

type CartItemProps = {
  item: CartEntry;
  onAdd: () => void;
  onRemove: () => void;
};

export function CartItem({ item, onAdd, onRemove }: CartItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eadbc4] py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#402516]">{item.name}</p>
        <p className="mt-1 text-sm text-[#806b56]">
          {formatRupees(item.price)} each
        </p>
        <p className="mt-1 text-sm font-semibold text-[#60452f]">
          {item.qty} × {formatRupees(item.price)} = {formatRupees(item.price * item.qty)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Remove one ${item.name}`}
          onClick={onRemove}
        >
          <Minus aria-hidden="true" />
        </Button>
        <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
        <Button
          type="button"
          size="icon-sm"
          aria-label={`Add one ${item.name}`}
          onClick={onAdd}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
