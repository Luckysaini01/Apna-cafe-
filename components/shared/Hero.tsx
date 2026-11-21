import Link from "next/link";
import { ArrowRight, Coffee, Leaf } from "lucide-react";
import { CAFE } from "@/lib/config";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#402516] text-[#fff8e7]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_25%,#9b6840_0%,#6b4226_35%,#402516_75%)]" />
      <div className="mx-auto grid min-h-[34rem] max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f0ca6c]">
            <Leaf aria-hidden="true" size={14} />
            100% pure veg
          </p>
          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.3em] text-[#edc978]">
            {CAFE.tagline}
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
            Chai, momos aur apne log.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
            A cozy adda for good food and better company. Pick a table, scan
            the QR, and order your favourites straight to WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#e6b849] px-5 font-bold text-[#402516] transition hover:bg-[#f0ca6c]"
            >
              Explore menu <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link
              href="/t/table1"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 font-semibold text-white transition hover:bg-white/20"
            >
              <Coffee aria-hidden="true" size={17} />
              Try table ordering
            </Link>
          </div>
        </div>
        <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-[2.5rem] border border-white/20 bg-[#fff8e7]/10 shadow-[0_30px_90px_rgba(20,10,5,0.35)] backdrop-blur">
          <div className="flex size-[76%] flex-col items-center justify-center rounded-full border border-[#f0ca6c]/60 bg-[#fff8e7] text-center text-[#4a2d19] shadow-inner">
            <Coffee aria-hidden="true" className="text-[#6b4226]" size={64} />
            <p className="mt-4 font-serif text-3xl font-bold">{CAFE.name}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#9b724e]">
              {CAFE.tagline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
