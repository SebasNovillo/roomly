import { ArrowDown, ArrowUpRight, Armchair, CalendarDays, Coffee, Users, Volume2 } from "lucide-react";
import { RoomlyLogo } from "@/components/roomly-logo";
import Link from "next/link";

const purposes = [
  { icon: Users, title: "Come together", description: "A place to meet, share ideas, and make progress as a team." },
  { icon: Armchair, title: "Find your focus", description: "A quiet corner for the work that needs your full attention." },
  { icon: CalendarDays, title: "Make room in your day", description: "Shared spaces, with a simpler way to plan your time." },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-10">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:z-10 focus:rounded-lg focus:bg-surface focus:p-3">Skip to content</a>
      <header className="flex items-center justify-between gap-4 border-b border-line py-6">
        <RoomlyLogo />
        <span className="hidden rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted lg:block">A new space is taking shape</span>
        <nav aria-label="Account" className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold sm:gap-5">
          <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link>
          <Link href="/sign-up" className="rounded-xl bg-primary px-4 py-2.5 text-white hover:bg-primary-hover">Create account</Link>
        </nav>
      </header>

      <main id="main">
        <section aria-labelledby="welcome-heading" className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="mb-5 text-sm font-semibold tracking-wide text-primary">WELCOME TO ROOMLY</p>
            <h1 id="welcome-heading" className="max-w-xl font-display text-5xl leading-[1.08] font-bold tracking-tight sm:text-6xl">A little space for your <span className="text-primary">next big idea.</span></h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">Meet, focus, or create. Roomly brings shared spaces together, so you can find the right place for whatever comes next.</p>
            <a href="#about-roomly" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-primary px-5 py-3.5 font-semibold text-white transition-colors hover:bg-primary-hover">
              Get to know Roomly <ArrowDown size={18} aria-hidden="true" />
            </a>
            <p className="mt-4 text-sm text-muted">Space discovery and booking are coming soon.</p>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-[0_12px_45px_-25px_rgba(23,33,60,0.22)] sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="font-display text-xl font-bold">Room for possibility</p>
              <ArrowUpRight className="text-primary" size={22} aria-hidden="true" />
            </div>
            <div aria-hidden="true" className="grid h-60 grid-cols-[1.4fr_1fr] grid-rows-2 gap-3 sm:h-72">
              <div className="row-span-2 flex flex-col justify-between rounded-2xl bg-primary-soft p-5 text-primary">
                <Users size={32} strokeWidth={1.5} />
                <div className="flex justify-center gap-3 py-4"><span className="h-20 w-12 rounded-full border-2 border-primary/25" /><span className="h-20 w-12 rounded-full border-2 border-primary/25" /></div>
                <span className="text-sm font-semibold">Meet & collaborate</span>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border border-line bg-background p-5"><Volume2 className="text-muted" size={25} strokeWidth={1.5} /><span className="text-sm font-semibold">Quiet & focused</span></div>
              <div className="flex flex-col justify-between rounded-2xl border border-line p-5"><Coffee className="text-primary" size={25} strokeWidth={1.5} /><span className="text-sm font-semibold">A fresh perspective</span></div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted">Different spaces. One place to start.</p>
          </div>
        </section>

        <section id="about-roomly" aria-labelledby="about-heading" className="scroll-mt-8 border-t border-line pt-10 pb-16">
          <h2 id="about-heading" className="font-display text-2xl font-bold tracking-tight">Good things start with the right space.</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {purposes.map(({ icon: Icon, title, description }) => (
              <article key={title}>
                <Icon className="mb-4 text-primary" size={24} strokeWidth={1.7} aria-hidden="true" />
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-xs text-muted">
        <p>Roomly · Shared spaces, made simple.</p>
        <p>Coming soon. Reservations are not yet available.</p>
      </footer>
    </div>
  );
}
