"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react";
import { SpacePhoto } from "@/features/spaces/components/space-photo";
import { timeLabel } from "../model";
import { bookingStatus, bookingTabs, bookingsHref, canCancel, reservationDateLabel, reservationDuration, tabLabels, type BookingListResult, type BookingTab } from "../my-bookings";
import { CancelBooking } from "./cancel-booking";

export function BookingsView({ result, tab, successReference }: {result:BookingListResult;tab:BookingTab;successReference?:string}) {
  const router = useRouter(), tabs = useRef<HTMLDivElement>(null);
  const list = result.ok ? result.list : null;
  useEffect(() => {
    if (!list) return;
    const now = Date.parse(list.now);
    const boundaries = list.bookings.flatMap(booking => [Date.parse(booking.starts_at),Date.parse(booking.ends_at)]).filter(value=>value > now);
    const delay = Math.min(60_000,...boundaries.map(value=>value-now+100));
    const timer = setTimeout(()=>router.refresh(),Math.max(250,delay));
    const refresh = () => router.refresh();
    window.addEventListener("focus",refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus",refresh); };
  },[list,router]);
  return <div className="my-bookings">
    <header className="dashboard-heading"><div><h1>My bookings</h1><p>Keep track of your reservations and manage your upcoming plans.</p></div><Link className="auth-button" href="/dashboard/spaces">Explore spaces</Link></header>
    {successReference && <p className="booking-success" role="status"><CheckCircle2 size={16} aria-hidden="true" /><span>Booking cancelled<span className="booking-success-reference"> · {successReference.toUpperCase()}</span></span></p>}
    <div className="booking-tabs" role="tablist" aria-label="Booking status" ref={tabs}>{bookingTabs.map((value,index)=><Link key={value} role="tab" aria-label={`${tabLabels[value]} ${list ? list.counts[value] : "count unavailable"}`} id={`booking-tab-${value}`} aria-controls="booking-list-panel" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} href={bookingsHref(value)}
      onKeyDown={event=>{
        let target = index;
        if(event.key === "ArrowRight") target = (index+1)%bookingTabs.length;
        else if(event.key === "ArrowLeft") target = (index+bookingTabs.length-1)%bookingTabs.length;
        else if(event.key === "Home") target=0;
        else if(event.key === "End") target=bookingTabs.length-1;
        else return;
        event.preventDefault();
        (tabs.current?.querySelectorAll<HTMLElement>("[role=tab]")[target])?.focus();
        router.push(bookingsHref(bookingTabs[target]));
      }}>{tabLabels[value]}<span className="booking-tab-count">{list ? list.counts[value] : "—"}</span></Link>)}</div>
    <p className="bookings-timezone"><Clock size={14} aria-hidden="true" />All times in America/Chicago</p>
    <section role="tabpanel" id="booking-list-panel" aria-labelledby={`booking-tab-${tab}`} tabIndex={0}>
      {!list ? <div className="dashboard-card catalog-state" role="alert"><h2>We couldn’t load your bookings</h2><p>Your booking history is temporarily unavailable. Please try again.</p><button type="button" className="auth-button" onClick={()=>router.refresh()}>Try again</button></div>
        : list.bookings.length === 0 ? <div className="bookings-empty"><span className="action-icon"><CalendarDays size={21} aria-hidden="true" /></span><h2>{tab === "upcoming" ? "No upcoming bookings" : tab === "past" ? "No past bookings yet" : "No cancelled bookings"}</h2>{tab === "upcoming" && <><p>Find a space for your next meeting or focus session.</p><Link className="text-link" href="/dashboard/spaces">Explore spaces</Link></>}</div>
        : <div className="booking-list">{list.bookings.map(booking=>{
          const status = bookingStatus(booking,list.now);
          return <article className="booking-list-card" key={booking.id} aria-label={`${booking.space?.name ?? "Space details unavailable"}, ${status}`}>
            <div className="booking-list-photo"><SpacePhoto image={booking.space?.image ?? undefined} /></div>
            <div className="booking-list-body"><div className="booking-card-heading"><div><h2>{booking.space?.name ?? "Space details unavailable"}</h2>{booking.space ? <p><MapPin size={14} aria-hidden="true" />Floor {booking.space.floor}</p> : <p>Space information is currently unavailable.</p>}</div><span className={`booking-status status-${status.toLowerCase().replaceAll(" ","-")}`}>{status}</span></div>
              <dl className="booking-card-fields"><div><dt>Date</dt><dd>{reservationDateLabel(booking.starts_at)}</dd></div><div><dt>Time</dt><dd>{timeLabel(booking.starts_at)}–{timeLabel(booking.ends_at)}</dd></div><div><dt>Duration</dt><dd>{reservationDuration(booking.starts_at,booking.ends_at)}</dd></div><div><dt>Reference</dt><dd className="booking-card-reference">{booking.id.toUpperCase()}</dd></div></dl>
              <div className="booking-card-links"><Link className="text-link" href={`/dashboard/reservations/${booking.id}`}>View details</Link>{canCancel(booking,list.now) && <CancelBooking booking={booking} />}</div>
            </div>
          </article>;
        })}</div>}
    </section>
    {list && list.total > list.pageSize && <nav className="catalog-pagination" aria-label="Booking pages">{list.page > 1 ? <Link className="text-link" href={bookingsHref(tab,list.page-1)}>Previous</Link> : <span>Previous</span>}<span>Page {list.page} of {Math.ceil(list.total/list.pageSize)}</span>{list.page * list.pageSize < list.total ? <Link className="text-link" href={bookingsHref(tab,list.page+1)}>Next</Link> : <span>Next</span>}</nav>}
  </div>;
}
