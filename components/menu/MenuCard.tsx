import { Plus, Minus, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/menu";
import { formatRupees } from "@/lib/menu";
import { MenuItemPhoto } from "@/components/menu/MenuItemPhoto";

type MenuCardProps = {
  item: MenuItem;
  quantity: number;
  allowOrdering: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onView: () => void;
};

export function MenuCard({
  item,
  quantity,
  allowOrdering,
  onAdd,
  onRemove,
  onView,
}: MenuCardProps) {
  return (
    <Card className="h-full border-[#eadbc4] bg-white shadow-[0_6px_20px_rgba(74,45,25,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader>
        <div className="relative">
          <MenuItemPhoto item={item} className="h-28 rounded-xl" />
          {item.best && (
            <span className="absolute left-2 top-2 rounded-full bg-[#e6b849] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#402516]">
              Bestseller
            </span>
          )}
        </div>
        <CardTitle className="line-clamp-1 pt-1 font-serif text-lg font-bold text-[#402516]">
          {item.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-[#806b56]">
          {item.desc}
        </p>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2 border-t border-[#f1e5d3] bg-[#fffaf0]">
        <span className="font-bold text-[#6b4226]">
          {formatRupees(item.price)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Details for ${item.name}`}
            onClick={onView}
            className="text-[#6b4226]"
          >
            <Info aria-hidden="true" />
          </Button>
          {allowOrdering &&
            (quantity > 0 ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Remove one ${item.name}`}
                  onClick={onRemove}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <span className="min-w-6 text-center text-sm font-bold text-[#402516]">
                  {quantity}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label={`Add one ${item.name}`}
                  onClick={onAdd}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={onAdd}
                className="bg-[#6b4226] text-white hover:bg-[#4a2d19]"
              >
                <Plus aria-hidden="true" />
                Add
              </Button>
            ))}
        </div>
      </CardFooter>
    </Card>
  );
}
