import Link from "next/link";
import { ArrowRight, CalendarDays, Compass, Ticket } from "lucide-react";
import { ChicagoDate } from "./chicago-date";

export function DashboardContent({ name, now }: { name: string; now: string }) {
  return <>
    <div className="dashboard-heading"><div><h1>Welcome back, {name}</h1><p>Your next space and upcoming plans, all in one place.</p><ChicagoDate initialTime={now} /></div><Link href="/dashboard/spaces" className="auth-button">Explore spaces</Link></div>
    <section className="dashboard-card next-booking" aria-labelledby="next-booking-title">
      <span className="empty-icon"><Compass size={21} strokeWidth={1.7} aria-hidden="true" /></span><h2 id="next-booking-title">Your next space is waiting</h2><p>Your next booking will appear here. Space discovery and booking are coming soon.</p><Link href="/dashboard/spaces" className="auth-button">Explore spaces</Link>
    </section>
    <section className="dashboard-card upcoming-plans" aria-labelledby="upcoming-title"><div className="card-heading"><div><h2 id="upcoming-title">Upcoming plans</h2><p>What’s ahead after your next booking.</p></div><Link href="/dashboard/bookings" className="text-link">View all bookings</Link></div><div className="plans-empty"><CalendarDays size={21} strokeWidth={1.5} aria-hidden="true" /><p>No upcoming plans to display. Booking is not available yet.</p></div></section>
    <div className="dashboard-bottom-grid"><section className="dashboard-card quick-actions" aria-labelledby="quick-actions-title"><h2 id="quick-actions-title">Quick actions</h2><div className="quick-actions-grid"><Link className="quick-action" href="/dashboard/spaces"><span className="action-icon"><Compass size={21} aria-hidden="true" /></span><div><h3>Find a space</h3><p>Space discovery is coming soon.</p></div><ArrowRight size={17} aria-hidden="true" /></Link><Link className="quick-action" href="/dashboard/bookings"><span className="action-icon"><Ticket size={21} aria-hidden="true" /></span><div><h3>Manage bookings</h3><p>Your future plans, all in one place.</p></div><ArrowRight size={17} aria-hidden="true" /></Link></div></section>
    <section className="dashboard-card booking-overview" aria-labelledby="overview-title"><h2 id="overview-title">Booking overview</h2><p className="overview-explanation">Booking data is not available yet.</p><dl className="overview-list">{["Upcoming", "Past", "Cancelled"].map(label => <div key={label}><dt>{label}</dt><dd><span aria-hidden="true">—</span><span className="sr-only">Not available</span></dd></div>)}</dl></section></div>
  </>;
}
