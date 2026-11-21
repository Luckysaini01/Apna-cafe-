"use client";

import { useEffect } from "react";
import { Check, Plus } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/menu";
import { formatRupees } from "@/lib/menu";
import { MenuItemPhoto } from "@/components/menu/MenuItemPhoto";

type ItemDrawerProps = {
  item: MenuItem | null;
  canOrder: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (itemId: string) => void;
};

export function ItemDrawer({
  item,
  canOrder,
  onOpenChange,
  onAdd,
}: ItemDrawerProps) {
  useEffect(() => {
    if (!item) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onOpenChange]);

  return (
    <Drawer open={item !== null} onOpenChange={onOpenChange} swipeDirection="down">
      <DrawerContent className="mx-auto max-h-[85svh] w-full max-w-lg rounded-t-3xl bg-[#fffdf8]">
        {item && (
          <>
            <DrawerHeader className="items-center px-6 pt-7">
              <MenuItemPhoto item={item} className="h-40 w-full max-w-sm rounded-2xl" />
              {item.best && (
                <span className="mt-3 rounded-full bg-[#e6b849] px-3 py-1 text-xs font-bold uppercase text-[#402516]">
                  Cafe favourite
                </span>
              )}
              <DrawerTitle className="mt-2 font-serif text-2xl font-bold text-[#402516]">
                {item.name}
              </DrawerTitle>
              <DrawerDescription className="max-w-sm text-center text-[#806b56]">
                {item.desc}
              </DrawerDescription>
              <p className="mt-2 text-xl font-bold text-[#6b4226]">
                {formatRupees(item.price)}
              </p>
            </DrawerHeader>
            <DrawerFooter className="gap-2 px-6 pb-6">
              {canOrder ? (
                <Button
                  type="button"
                  onClick={() => {
                    onAdd(item.id);
                    onOpenChange(false);
                  }}
                  className="h-12 w-full bg-[#6b4226] text-base text-white hover:bg-[#4a2d19]"
                >
                  <Plus aria-hidden="true" />
                  Add to order
                </Button>
              ) : (
                <p className="py-2 text-center text-sm text-[#806b56]">
                  Scan a table QR code to place an order.
                </p>
              )}
              <DrawerClose
                render={
                  <Button type="button" variant="outline" className="w-full">
                    <Check aria-hidden="true" />
                    Done
                  </Button>
                }
              />
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
