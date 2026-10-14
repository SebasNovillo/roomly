import { RoomlyLogo } from "@/components/roomly-logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-6 sm:px-10">
    <header className="border-b border-line py-6"><RoomlyLogo /></header>
    <main className="mx-auto my-12 max-w-md rounded-3xl border border-line bg-surface p-6 shadow-[0_12px_45px_-25px_rgba(23,33,60,0.22)] sm:my-16 sm:p-10">{children}</main>
  </div>;
}
