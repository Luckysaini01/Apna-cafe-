import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Bestsellers } from "@/components/shared/Bestsellers";
import { Hero } from "@/components/shared/Hero";

export default function Home() {
  return (
    <SiteShell>
      <main>
        <Hero />
        <Bestsellers />
        <section className="border-y border-[#eadbc4] bg-[#f5ead8]">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#6b4226]">
                <Leaf aria-hidden="true" size={15} />
                Fresh, veg, and made with care
              </p>
              <h2 className="mt-3 max-w-xl font-serif text-3xl font-bold text-[#402516]">
                Your table, your favourites, your Apna Cafe.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/menu"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#6b4226] px-5 font-bold text-white transition hover:bg-[#4a2d19]"
              >
                Browse menu <ArrowRight aria-hidden="true" size={17} />
              </Link>
              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#6b4226] bg-white px-5 font-bold text-[#6b4226] transition hover:bg-[#f8f1e7]"
              >
                Admin login
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
