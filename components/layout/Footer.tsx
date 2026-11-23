import Link from "next/link";
import { CAFE } from "@/lib/config";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";

export function Footer() {
  return (
    <footer id="site-footer" className="border-t border-[#eadbc4] bg-[#402516] text-[#fff8e7]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-serif text-lg font-bold">{CAFE.name}</p>
          <p className="mt-1 text-sm text-white/65">{CAFE.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/75">
          <Link className="hover:text-white" href="/menu">
            Menu
          </Link>
          <Link className="hover:text-white" href="/contact">
            Contact
          </Link>
          <WhatsAppButton
            message={`Hi ${CAFE.name}, I have a question.`}
            label="WhatsApp"
            variant="footer"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
          <p>Apna Cafe made by lucky &copy; 2026</p>
          <a className="whitespace-nowrap hover:text-white" href="tel:+919719007099">
            9719007099
          </a>
        </div>
      </div>
    </footer>
  );
}
