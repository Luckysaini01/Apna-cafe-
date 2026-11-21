type WhatsAppOrderButtonProps = {
  href: string | null;
};

export function WhatsAppOrderButton({ href }: WhatsAppOrderButtonProps) {
  if (!href) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-2xl bg-slate-300 px-5 py-4 text-base font-bold text-slate-600"
        >
          WhatsApp number not set
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">
          Add the cafe number to <code>.env.local</code> to enable ordering.
        </p>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#168c4a] px-5 py-4 text-base font-bold text-white transition hover:bg-[#11733c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168c4a]"
    >
      <span aria-hidden="true">📲</span>
      Place order on WhatsApp
    </a>
  );
}
