import { PanelsTopLeft } from "lucide-react";
import Link from "next/link";

export function RoomlyLogo() {
  return (
    <Link href="/" aria-label="Roomly home" className="inline-flex items-center gap-3 rounded-sm">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
        <PanelsTopLeft size={23} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="font-display text-2xl font-bold tracking-tight">Roomly<span className="text-primary">.</span></span>
    </Link>
  );
}
