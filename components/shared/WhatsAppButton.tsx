import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

type WhatsAppButtonProps = {
  message: string;
  label?: string;
  variant?: "default" | "footer";
};

export function WhatsAppButton({
  message,
  label = "Chat on WhatsApp",
  variant = "default",
}: WhatsAppButtonProps) {
  const href = buildWhatsAppUrl(message);

  if (!href) {
    return (
      <Button
        type="button"
        disabled
        variant={variant === "footer" ? "outline" : "default"}
        title="Set NEXT_PUBLIC_OWNER_WHATSAPP to enable WhatsApp"
        className={
          variant === "footer"
            ? "border-white/30 bg-transparent text-white hover:bg-white/10"
            : "bg-[#168c4a] text-white hover:bg-[#11733c]"
        }
      >
        <MessageCircle aria-hidden="true" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      nativeButton={false}
      render={
        <a href={href} target="_blank" rel="noopener noreferrer" />
      }
      variant={variant === "footer" ? "outline" : "default"}
      className={
        variant === "footer"
          ? "border-white/30 bg-transparent text-white hover:bg-white/10"
          : "bg-[#168c4a] text-white hover:bg-[#11733c]"
      }
    >
      <MessageCircle aria-hidden="true" />
      {label}
    </Button>
  );
}
