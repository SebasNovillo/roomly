import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, Clock3, Grid2X2, MapPin, Monitor, Users } from "lucide-react";
import { RoomlyLogo } from "@/components/roomly-logo";
import { BookingPreview } from "./booking-preview";
import { rooms } from "./rooms";

export function RoomPhoto({ slug, alt, className = "", priority = false }: { slug: string; alt: string; className?: string; priority?: boolean }) {
  return <Image className={className} src={`/images/spaces/${slug}.jpg`} alt={alt} width={900} height={600} sizes="(max-width: 767px) 100vw, 50vw" priority={priority} />;
}

export function Capacity({ children }: { children: React.ReactNode }) {
  return <p className="landing-capacity"><Users size={14} strokeWidth={1.5} aria-hidden="true" />{children}</p>;
}

export function BookingFields({ featured = false }: { featured?: boolean }) {
  return <dl className="landing-booking-fields">
    <div><dt>Date</dt><dd>{featured ? "Nov 13, 2026" : <>Friday, November 13,<br />2026</>}</dd></div>
    <div><dt>Time</dt><dd>10:00–11:00 AM</dd></div>
    <div><dt>{featured ? "Capacity" : "Duration"}</dt><dd>{featured ? "16 people" : "1 hour"}</dd></div>
  </dl>;
}

function BookingsIllustration() {
  return <div className="landing-bookings-preview" role="img" aria-label="Illustrative My bookings preview: one confirmed Atlas Meeting Room reservation on November 13, 2026, from 10 to 11 AM. No real reservation.">
    <div className="landing-bookings-heading"><div><h3>My bookings</h3><p>Keep track of your reservations and manage your upcoming plans.</p></div><span className="landing-mini-cta">Explore spaces</span></div>
    <div className="landing-booking-tabs"><span>Upcoming <b>1</b></span><span>Past</span><span>Cancelled</span></div>
    <p className="landing-timezone"><Clock3 size={12} aria-hidden="true" />All times in America/Chicago</p>
    <div className="landing-reservation"><RoomPhoto slug={rooms[0].slug} alt="" /><div className="landing-reservation-body">
      <div className="landing-reservation-heading"><h4>Atlas Meeting Room</h4><span>Confirmed</span></div>
      <p className="landing-floor"><MapPin size={14} aria-hidden="true" />Floor 2</p><BookingFields />
      <div className="landing-illustrative-links"><span>View details</span><span>Cancel booking</span></div>
    </div></div>
  </div>;
}

export function LandingPage({ authenticated }: { authenticated: boolean }) {
  const destination = authenticated ? "/dashboard" : "/sign-up";
  const action = authenticated ? "Go to dashboard" : "Get started";
  const brandDestination = authenticated ? "/dashboard" : "/";
  return <div className="roomly-landing">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="landing-header"><div className="landing-container"><RoomlyLogo href={brandDestination} />
      <nav aria-label="Account">{!authenticated && <Link href="/sign-in" className="landing-sign-in">Sign in</Link>}<Link href={destination} className="landing-button">{action}</Link></nav>
    </div></header>
    <main id="main">
      <section className="landing-hero" aria-labelledby="hero-heading"><div className="landing-container landing-hero-grid">
        <div className="landing-hero-copy"><h1 id="hero-heading">A little space <br />for your next <br /><span>big idea.</span></h1>
          <p>Find a place to focus, meet, or collaborate. Check availability and reserve a space that fits your day.</p>
          <div className="landing-hero-actions"><Link href={destination} className="landing-button">{action}</Link>{!authenticated && <Link href="/sign-in" className="landing-sign-in">Sign in <ChevronRight size={16} aria-hidden="true" /></Link>}</div>
          <ul className="landing-purposes"><li><Users aria-hidden="true" />Meeting rooms</li><li><Monitor aria-hidden="true" />Study rooms</li><li><Grid2X2 aria-hidden="true" />Coworking spaces</li></ul>
        </div>
        <div className="landing-hero-art">
          <RoomPhoto slug="horizon-conference-room" alt="Sunlit conference room with a long table and high-backed chairs" className="landing-hero-photo" priority />
          <RoomPhoto slug="focus-office" alt="Meeting table and chairs behind a glass partition" className="landing-overlap-photo" priority />
          <div className="landing-featured"><span className="landing-featured-badge">Roomly</span><p className="landing-eyebrow">Featured space</p><h2>Horizon Conference Room</h2><Capacity>16 people</Capacity><BookingFields featured /><p className="landing-illustrative-note">Illustrative booking details</p></div>
        </div>
      </div></section>
      <section className="landing-showcase landing-container" aria-labelledby="showcase-heading">
        <div className="landing-section-heading"><div><p className="landing-eyebrow">Spaces for every kind of work</p><h2 id="showcase-heading">Find the room that fits the moment.</h2></div><p>Compare room size, setup, and amenities before choosing the space that works for you.</p></div>
        <div className="landing-room-grid">{rooms.map((room, index) => <article className={`landing-room-card ${index === 0 ? "landing-room-large" : ""}`} key={room.slug}>
          <RoomPhoto slug={room.slug} alt={room.alt} /><div className="landing-room-body"><p className="landing-eyebrow">{room.type}</p><h3>{room.name}</h3><Capacity>Up to {room.capacity} people</Capacity><ul className="landing-amenities">{room.amenities.map(amenity => <li key={amenity}>{amenity}</li>)}</ul></div>
        </article>)}</div>
      </section>
      <section className="landing-experience" aria-labelledby="experience-heading"><div className="landing-container">
        <p className="landing-eyebrow">The booking experience</p><h2 id="experience-heading">A clear path from search to booked.</h2><p className="landing-experience-intro">Each step uses the same clear controls and room information you’ll find throughout Roomly.</p><BookingPreview />
      </div></section>
      <section className="landing-management" aria-labelledby="management-heading"><div className="landing-container landing-management-grid">
        <BookingsIllustration /><div className="landing-management-copy"><h2 id="management-heading">Your day, a little more organized.</h2><ul>{["See upcoming reservations.", "Check for conflicts before booking.", "Cancel when plans change."].map(text => <li key={text}><Check size={14} aria-hidden="true" />{text}</li>)}</ul>
          <div className="landing-cta-panel"><h3>Make room for what matters.</h3><p>Choose a space and reserve a time that works for your day.</p><Link href={destination} className="landing-button landing-button-white">{action}</Link></div>
        </div>
      </div></section>
    </main>
    <footer className="landing-footer"><div className="landing-container"><RoomlyLogo href={brandDestination} /><p>© 2026 Roomly</p></div></footer>
  </div>;
}
