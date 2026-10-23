"use client";
import Link from "next/link";
export default function ReservationError({ reset }: { reset: () => void }) {
  return <section className="dashboard-card catalog-state" role="alert"><h1>We couldn’t load this booking</h1><p>Please try again to view your booking details.</p><button type="button" className="auth-button" onClick={reset}>Try again</button><Link className="text-link" href="/dashboard/spaces">Explore spaces</Link></section>;
}
