import { Clock3, MapPin } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { CAFE } from "@/lib/config";

export default function ContactPage() {
  return (
    <SiteShell>
      <main className="mx-auto min-h-[70svh] max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a06a3f]">
            We&apos;d love to hear from you
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-[#402516] sm:text-5xl">
            Say hello to {CAFE.name}
          </h1>
          <p className="mt-5 text-base leading-7 text-[#806b56]">
            Have a question about the menu, your order, or visiting the cafe?
            Send us a WhatsApp message and our team will help.
          </p>
          <div className="mt-8">
            <WhatsAppButton message={`Hi ${CAFE.name}, I have a question.`} />
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#eadbc4] bg-white p-6">
            <MapPin aria-hidden="true" className="text-[#6b4226]" />
            <h2 className="mt-4 font-serif text-xl font-bold text-[#402516]">
              Find us
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#806b56]">
              Message us on WhatsApp for directions and today&apos;s cafe
              details.
            </p>
          </div>
          <div className="rounded-2xl border border-[#eadbc4] bg-white p-6">
            <Clock3 aria-hidden="true" className="text-[#6b4226]" />
            <h2 className="mt-4 font-serif text-xl font-bold text-[#402516]">
              Cafe hours
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#806b56]">
              Contact us to confirm today&apos;s opening hours.
            </p>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
