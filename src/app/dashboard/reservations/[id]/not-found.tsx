import Link from "next/link";
export default function BookingNotFound() { return <div className="dashboard-card catalog-state"><h1>Booking not found</h1><p>This booking is unavailable for your account.</p><Link className="text-link" href="/dashboard/spaces">Explore spaces</Link></div>; }
