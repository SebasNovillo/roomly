import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { Space } from "@/features/spaces/catalog";
import { chicagoParts, timeLabel, type Reservation } from "../model";
import { BookingSummary } from "./booking-summary";
import { bookingCategory, bookingStatus, bookingsHref, reservationDuration } from "../my-bookings";

export function ConfirmationView({ reservation, space, now }: { reservation: Reservation; space: Space | null; now:string }) {
  const start = chicagoParts(new Date(reservation.starts_at)), end = chicagoParts(new Date(reservation.ends_at));
  const category = bookingCategory(reservation,now), status = bookingStatus(reservation,now);
  const title = category === "cancelled" ? "This booking was cancelled" : category === "past" ? "Past booking" : status === "In progress" ? "Your booking is in progress" : "Your booking is confirmed";
  const description = category === "cancelled" ? "This reservation is no longer active." : category === "past" ? "This reservation has ended." : status === "In progress" ? "Your reserved time has started." : "Your space is reserved. We look forward to seeing you.";
  return <div className="booking-page">
    <header className="catalog-heading booking-confirmation-heading">{status === "Confirmed" && <CheckCircle2 size={44} aria-hidden="true" />}<h1>{title}</h1><p>{description}</p></header>
    <p className="booking-reference">Booking reference <strong>{reservation.id.toUpperCase()}</strong></p>
    {space ? <BookingSummary space={space} selection={{ date:start.date,start:start.time,end:end.time }} instants={reservation} /> : <div className="dashboard-card space-information"><p>Space details are currently unavailable.</p><p>{start.date} · {timeLabel(reservation.starts_at)}–{timeLabel(reservation.ends_at)} · America/Chicago</p><p>{reservationDuration(reservation.starts_at,reservation.ends_at)}</p></div>}
    <div className="booking-confirmation-links">{space && <Link className="auth-button" href={`/dashboard/spaces/${encodeURIComponent(space.slug)}`}>View space</Link>}<Link className="text-link" href="/dashboard/spaces">Explore more spaces</Link><Link className="text-link" href={bookingsHref(category)}>Back to my bookings</Link></div>
  </div>;
}
