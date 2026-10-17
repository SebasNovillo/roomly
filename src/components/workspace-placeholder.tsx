import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Compass } from "lucide-react";

export function WorkspacePlaceholder({ kind }: { kind: "spaces" | "bookings" }) {
  const spaces = kind === "spaces";
  const Icon = spaces ? Compass : CalendarDays;
  return <>
    <div className="dashboard-heading"><div><h1>{spaces ? "Explore spaces" : "My bookings"}</h1><p>{spaces ? "Find a little space for your next big idea." : "A home for your plans."}</p></div></div>
    <section className="dashboard-card placeholder-card"><span className="empty-icon"><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span><span className="subtle-badge">Coming soon</span><h2>{spaces ? "Good spaces are on the way" : "Your bookings will live here"}</h2><p>{spaces ? "We’re making room for space discovery. Browsing spaces, checking availability, and making a booking are not available yet." : "Booking and booking management are not available yet. Once they are, you’ll be able to find your upcoming and past bookings here."}</p><div className="placeholder-links"><Link href="/dashboard" className="auth-button"><ArrowLeft size={16} aria-hidden="true" /> Back to dashboard</Link><Link className="text-link" href={spaces ? "/dashboard/bookings" : "/dashboard/spaces"}>{spaces ? "My bookings" : "Explore spaces"}<ArrowRight size={16} aria-hidden="true" /></Link></div></section>
  </>;
}
