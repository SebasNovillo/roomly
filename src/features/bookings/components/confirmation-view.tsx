import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { Space } from "@/features/spaces/catalog";
import { chicagoParts, timeLabel, type Reservation } from "../model";
import { BookingSummary } from "./booking-summary";

export function ConfirmationView({ reservation, space }: { reservation: Reservation; space: Space | null }) {
  const start = chicagoParts(new Date(reservation.starts_at)), end = chicagoParts(new Date(reservation.ends_at));
  return <div className="booking-page">
    <header className="catalog-heading booking-confirmation-heading">{reservation.status === "confirmed" && <CheckCircle2 size={44} aria-hidden="true" />}<h1>{reservation.status === "confirmed" ? "Your booking is confirmed" : "This booking was cancelled"}</h1><p>{reservation.status === "confirmed" ? "Your space is reserved. We look forward to seeing you." : "This reservation is no longer active."}</p></header>
    <p className="booking-reference">Booking reference <strong>{reservation.id.toUpperCase()}</strong></p>
    {space ? <BookingSummary space={space} selection={{ date:start.date,start:start.time,end:end.time }} /> : <div className="dashboard-card space-information"><p>Space details are currently unavailable.</p><p>{start.date} · {timeLabel(reservation.starts_at)}–{timeLabel(reservation.ends_at)} · America/Chicago</p></div>}
    <div className="booking-confirmation-links">{space && <Link className="auth-button" href={`/dashboard/spaces/${encodeURIComponent(space.slug)}`}>View space</Link>}<Link className="text-link" href="/dashboard/spaces">Explore more spaces</Link></div>
  </div>;
}
