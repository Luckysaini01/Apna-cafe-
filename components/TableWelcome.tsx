import { CAFE } from "@/lib/config";

type TableWelcomeProps = {
  tableNumber: string;
  waiterHref: string | null;
  onViewMenu: () => void;
};

export function TableWelcome({
  tableNumber,
  waiterHref,
  onViewMenu,
}: TableWelcomeProps) {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[radial-gradient(ellipse_at_top,#8e5c37_0%,#6b4226_48%,#402516_100%)] px-5 py-10 text-[#fff8e7]">
      <section className="w-full max-w-sm text-center">
        <div
          aria-hidden="true"
          className="mx-auto flex size-24 items-center justify-center rounded-full border border-white/30 bg-[#fff8e7] text-5xl shadow-[0_20px_60px_rgba(27,14,7,0.35)]"
        >
          ☕
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.32em] text-[#edc978]">
          {CAFE.tagline}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-wide">
          {CAFE.name}
        </h1>
        {CAFE.pureVeg && (
          <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#2e7d32] px-4 py-2 text-sm font-semibold text-white">
            <span aria-hidden="true">🌱</span>
            100% Pure Veg
          </p>
        )}

        <p className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-6 py-4 text-lg font-semibold shadow-lg backdrop-blur">
          <span aria-hidden="true">🍽️</span>
          Table {tableNumber}
        </p>

        <button
          type="button"
          onClick={onViewMenu}
          className="mt-8 w-full rounded-2xl bg-[#e6b849] px-6 py-4 text-lg font-bold text-[#402516] shadow-lg transition hover:bg-[#f0ca6c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff8e7]"
        >
          View menu <span aria-hidden="true">→</span>
        </button>

        {waiterHref ? (
          <a
            href={waiterHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium text-[#fff8e7] underline decoration-white/50 underline-offset-4 hover:decoration-white"
          >
            <span aria-hidden="true">🛎️</span>
            <span className="ml-2">Call waiter on WhatsApp</span>
          </a>
        ) : (
          <p className="mt-5 text-xs text-white/65">
            Waiter requests need the cafe WhatsApp number configured.
          </p>
        )}
      </section>
    </main>
  );
}