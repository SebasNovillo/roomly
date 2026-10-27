"use client";
import Link from "next/link";
export default function BookingsError({reset}:{reset:()=>void}) { return <section className="dashboard-card catalog-state" role="alert"><h1>We couldn’t load your bookings</h1><p>Please try again to view your reservations.</p><button className="auth-button" type="button" onClick={reset}>Try again</button><Link className="text-link" href="/dashboard/spaces">Explore spaces</Link></section>; }
