"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Compass, MapPin, Ticket } from "lucide-react";
import { SpacePhoto } from "@/features/spaces/components/space-photo";
import { spaceTypes } from "@/features/spaces/catalog";
import { timeLabel } from "@/features/bookings/model";
import { bookingStatus, bookingTabs, bookingsHref, reservationDateLabel, reservationDuration, tabLabels } from "@/features/bookings/my-bookings";
import { dashboardRefreshDelay, type DashboardResult } from "@/features/dashboard/model";
import { useDashboardSession } from "@/features/dashboard/use-dashboard-session";
import { ChicagoDate } from "./chicago-date";

export function DashboardContent({ name, now, result:serverResult, accountId }: {name:string;now:string;result:DashboardResult | null;accountId?:string}) {
  const currentAccount=useDashboardSession(accountId);
  const result=currentAccount ? serverResult : null;
  const router=useRouter(), [refreshing,startTransition]=useTransition();
  const dashboard=result?.ok ? result.dashboard : null;
  useEffect(()=>{
    if(!result) return;
    const refresh=()=>startTransition(()=>router.refresh());
    const cards=dashboard ? [...(dashboard.featured ? [dashboard.featured] : []),...dashboard.plans] : [];
    const timer=setTimeout(refresh,dashboard ? dashboardRefreshDelay(dashboard.now,cards) : 60_000);
    window.addEventListener("focus",refresh);
    return ()=>{clearTimeout(timer);window.removeEventListener("focus",refresh);};
  },[dashboard,result,router]);
  const featured=dashboard?.featured;
  const status=featured && dashboard ? bookingStatus(featured,dashboard.now) : null;
  const type=featured?.space && dashboard?.spaceTypes[featured.space.id];
  return <div className="dashboard-home">
    <div className="dashboard-heading"><div><h1>{currentAccount && name ? `Welcome back, ${name}` : "Your dashboard"}</h1><p>Your next space and upcoming plans, all in one place.</p><ChicagoDate initialTime={now} /></div><Link href="/dashboard/spaces" className="auth-button">Explore spaces</Link></div>
    <p className="sr-only" role="status">{refreshing ? "Refreshing your bookings…" : ""}</p>
    <div className="dashboard-columns">
      <div className="dashboard-primary">
        {!result ? <section className="dashboard-card dashboard-data-state" role="status" aria-busy="true"><h2>Loading your bookings…</h2><p>Your dashboard will be ready shortly.</p></section>
          : !dashboard ? <section className="dashboard-card dashboard-data-state" role="alert"><h2>We couldn’t load your bookings</h2><p>Your booking information is temporarily unavailable. Please try again.</p><button type="button" className="auth-button" disabled={refreshing} onClick={()=>startTransition(()=>router.refresh())}>{refreshing ? "Trying again…" : "Try again"}</button></section>
          : featured ? <section className="dashboard-card dashboard-featured" aria-labelledby="next-booking-title">
            <div className="card-heading"><h2 id="next-booking-title">{status === "In progress" ? "Your current booking" : "Your next booking"}</h2><span className={`booking-status status-${status?.toLowerCase().replaceAll(" ","-")}`}>{status}</span></div>
            <div className="dashboard-featured-photo"><SpacePhoto image={featured.space?.image ?? undefined} priority /></div>
            <div className="dashboard-featured-body"><p className="space-type">{type ? spaceTypes[type] : "Space type unavailable"}</p><h3>{featured.space?.name ?? "Space details unavailable"}</h3>{featured.space ? <p className="dashboard-location"><MapPin size={14} aria-hidden="true" />Floor {featured.space.floor}</p> : <p>Space information is currently unavailable.</p>}
              <dl className="dashboard-booking-fields"><div><dt>Date</dt><dd>{reservationDateLabel(featured.starts_at)}</dd></div><div><dt>Time</dt><dd>{timeLabel(featured.starts_at)}–{timeLabel(featured.ends_at)}</dd></div><div><dt>Duration</dt><dd>{reservationDuration(featured.starts_at,featured.ends_at)}</dd></div><div><dt>Reference</dt><dd className="booking-card-reference">{featured.id.toUpperCase()}</dd></div></dl>
              <div className="dashboard-booking-links"><Link className="auth-button" href={`/dashboard/reservations/${featured.id}`}>View booking details</Link>{featured.space && <Link className="text-link" href={`/dashboard/spaces/${featured.space.slug}`}>View space<ArrowRight size={15} aria-hidden="true" /></Link>}</div>
            </div>
          </section> : <section className="dashboard-card next-booking" aria-labelledby="next-booking-title"><span className="empty-icon"><Compass size={21} strokeWidth={1.7} aria-hidden="true" /></span><h2 id="next-booking-title">Your next space is waiting</h2><p>Find a space and book a time that works for you.</p><Link href="/dashboard/spaces" className="auth-button">Explore spaces</Link></section>}
        <section className="dashboard-card upcoming-plans" aria-labelledby="upcoming-title"><div className="card-heading"><div><h2 id="upcoming-title">Upcoming plans</h2><p>What’s ahead after your next booking.</p></div><Link href={bookingsHref("upcoming")} className="text-link">View all bookings</Link></div>
          {!dashboard ? <div className="plans-empty"><CalendarDays size={21} aria-hidden="true" /><p>{result ? "Upcoming plans could not be loaded." : "Loading upcoming plans…"}</p></div>
            : dashboard.plans.length ? <ol className="dashboard-plans">{dashboard.plans.map(booking=><li key={booking.id}><span className="action-icon"><CalendarDays size={19} aria-hidden="true" /></span><div><h3>{booking.space?.name ?? "Space details unavailable"}</h3><p>{reservationDateLabel(booking.starts_at)}</p><p>{timeLabel(booking.starts_at)}–{timeLabel(booking.ends_at)}</p></div><Link className="text-link" aria-label={`View booking: ${booking.space?.name ?? "Space details unavailable"}, ${reservationDateLabel(booking.starts_at)}`} href={`/dashboard/reservations/${booking.id}`}><span>View booking</span><ArrowRight size={16} aria-hidden="true" /></Link></li>)}</ol>
            : <div className="plans-empty"><CalendarDays size={21} strokeWidth={1.5} aria-hidden="true" /><p>{featured ? "You’re all set. No additional upcoming bookings." : "No upcoming bookings yet."}</p></div>}
        </section>
      </div>
      <div className="dashboard-secondary">
        <section className="dashboard-card quick-actions" aria-labelledby="quick-actions-title"><h2 id="quick-actions-title">Quick actions</h2><div className="quick-actions-grid"><Link className="quick-action" href="/dashboard/spaces"><span className="action-icon"><Compass size={21} aria-hidden="true" /></span><div><h3>Find a space</h3><p>Browse rooms and choose your time.</p></div><ArrowRight size={17} aria-hidden="true" /></Link><Link className="quick-action" href="/dashboard/bookings"><span className="action-icon"><Ticket size={21} aria-hidden="true" /></span><div><h3>Manage bookings</h3><p>View your plans and manage reservations.</p></div><ArrowRight size={17} aria-hidden="true" /></Link></div></section>
        <section className="dashboard-card booking-overview" aria-labelledby="overview-title"><h2 id="overview-title">Booking overview</h2>{!dashboard && <p className="overview-explanation">{result ? "Booking totals are unavailable." : "Loading booking totals…"}</p>}<dl className="overview-list">{bookingTabs.map(tab=><div key={tab}><dt><Link className="text-link" href={bookingsHref(tab)}>{tabLabels[tab]}</Link></dt><dd>{dashboard ? dashboard.counts[tab] : <><span aria-hidden="true">—</span><span className="sr-only">{result ? "Unavailable" : "Loading"}</span></>}</dd></div>)}</dl></section>
      </div>
    </div>
  </div>;
}
