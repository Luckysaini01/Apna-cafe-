"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee } from "lucide-react";
import { CAFE } from "@/lib/config";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#eadbc4] bg-[#fffaf0]/95 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <Link href="/" className="flex min-w-0 items-center gap-1.5 text-[#4a2d19] sm:gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#6b4226] text-[#fff8e7] sm:size-9">
            <Coffee aria-hidden="true" size={19} />
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-base font-bold leading-tight">
              {CAFE.name}
            </span>
            <span className="hidden text-[10px] font-medium tracking-wide text-[#9b724e] min-[380px]:block">
              {CAFE.tagline}
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-2 py-2 text-xs font-semibold transition min-[380px]:px-2.5 min-[380px]:text-sm sm:px-4",
                  active
                    ? "bg-[#6b4226] text-white"
                    : "text-[#60452f] hover:bg-[#f1e5d3]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
