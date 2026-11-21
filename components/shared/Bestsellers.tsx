"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMenuItem, formatRupees, type MenuItem } from "@/lib/menu";
import { MenuItemPhoto } from "@/components/menu/MenuItemPhoto";

const bestsellerIds = ["m1", "c1", "p3"];
const API_URL = (process.env.NEXT_PUBLIC_DINE_OS_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || "apna-cafe";
const fallbackBestsellers = bestsellerIds.flatMap((id) => {
  const item = getMenuItem(id);
  return item ? [item] : [];
});

export function Bestsellers() {
  const [bestsellers, setBestsellers] = useState(fallbackBestsellers);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLiveBestsellers() {
      try {
        const response = await fetch(
          `${API_URL}/v1/public/${encodeURIComponent(TENANT_SLUG)}/menu`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Unable to load the live menu.");

        const payload = (await response.json()) as {
          categories?: { id: string; name: string }[];
          items?: MenuItem[];
        };
        if (!Array.isArray(payload.items) || payload.items.length === 0) return;

        const categoryNames = new Map(
          (payload.categories ?? []).map((category) => [category.id, category.name]),
        );
        const liveItems = payload.items.map((item) => ({
          ...item,
          categoryName: item.categoryName ?? categoryNames.get(item.category),
        }));
        const featuredRules = [
          { name: "Afghani Veg Momos", category: "momo" },
          { name: "Kulhad Chai", category: "chai" },
          { name: "Paneer Tikka Pizza", category: "pizza" },
        ];
        const liveBestsellers = featuredRules.flatMap((rule) => {
          const preferred = liveItems.find(
            (item) => item.name.trim().toLowerCase() === rule.name.toLowerCase(),
          );
          const categoryFallback = liveItems.find((item) =>
            (item.categoryName ?? item.category).toLowerCase().includes(rule.category),
          );
          const item = preferred ?? categoryFallback;
          return item ? [item] : [];
        });

        if (liveBestsellers.length > 0) setBestsellers(liveBestsellers);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        // Keep the saved menu visible when the API is offline.
      }
    }

    void loadLiveBestsellers();
    return () => controller.abort();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a06a3f]">
            Cafe favourites
          </p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-[#402516] sm:text-4xl">
            Crowd-pleasers
          </h2>
        </div>
        <Link
          href="/menu"
          className="hidden items-center gap-2 text-sm font-bold text-[#6b4226] hover:text-[#402516] sm:inline-flex"
        >
          View full menu <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {bestsellers.map((item) => (
          <Card
            key={item.id}
            className="border-[#eadbc4] bg-white shadow-[0_10px_30px_rgba(74,45,25,0.06)]"
          >
            <CardHeader>
              <MenuItemPhoto item={item} className="mb-3 h-36 w-full rounded-xl sm:h-40" />
              <CardTitle className="font-serif text-xl font-bold text-[#402516]">
                {item.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-[#806b56]">{item.desc}</p>
            </CardContent>
            <CardFooter className="justify-between border-t-[#eadbc4] bg-[#fffaf0]">
              <span className="font-bold text-[#6b4226]">
                {formatRupees(item.price)}
              </span>
              <Button
                nativeButton={false}
                render={<Link href="/menu" />}
                variant="ghost"
                size="sm"
                className="text-[#6b4226]"
              >
                <ArrowRight aria-hidden="true" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Link
        href="/menu"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#6b4226] sm:hidden"
      >
        View full menu <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </section>
  );
}
