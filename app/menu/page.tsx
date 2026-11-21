import { MenuGrid } from "@/components/menu/MenuGrid";
import { SiteShell } from "@/components/layout/SiteShell";

export default function MenuPage() {
  return (
    <SiteShell>
      <main className="min-h-[70svh] bg-[#fff8e7]">
        <MenuGrid />
      </main>
    </SiteShell>
  );
}
