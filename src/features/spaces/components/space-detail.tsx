import Link from "next/link";
import { ArrowLeft, Check, MapPin, Monitor, Plug, Presentation, Users, Video, Wifi } from "lucide-react";
import { amenityLabels, catalogHref, spaceTypes, type CatalogFilters } from "../catalog";
import { formatOpeningTime, weekdays, type DetailedSpace } from "../details";
import { SpaceGallery } from "./space-gallery";
import { BookingExperience, type BookingProps } from "@/features/bookings/components/booking-experience";

const amenityIcons = { "wi-fi": Wifi, whiteboard: Presentation, display: Monitor, "power-outlets": Plug, "video-conferencing": Video };

export function SpaceDetail({ space, filters, booking }: { space: DetailedSpace; filters: CatalogFilters; booking?: BookingProps }) {
  const information = <>
    <section className="space-information dashboard-card"><h2>About this space</h2><p className="space-description">{space.description}</p></section>
    <section className="space-information dashboard-card"><h2>Amenities</h2>{space.amenities.length ? <ul className="detail-amenities">{space.amenities.map(amenity => {
      const Icon = amenityIcons[amenity];
      return <li key={amenity}><span><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span>{amenityLabels[amenity]}</li>;
    })}</ul> : <p className="detail-empty">No amenities are listed for this space.</p>}</section></>;
  const supplemental = <div className="space-detail-bottom">
      <section className="space-information dashboard-card"><h2>Opening hours</h2><p className="hours-timezone">All times in America/Chicago</p>
        {!space.openingHours.ok ? <p role="status" className="detail-empty">Opening hours are temporarily unavailable.</p> : <dl className="opening-hours">{weekdays.map((label, weekday) => {
          const row = space.openingHours.ok ? space.openingHours.rows.find(row => row.weekday === weekday) : undefined;
          return <div key={label}><dt>{label}</dt><dd>{!row ? <span className="hours-unconfigured">Not configured</span> : row.is_closed ? "Closed" : <><time dateTime={row.opens_at}>{formatOpeningTime(row.opens_at)}</time>–<time dateTime={row.closes_at}>{formatOpeningTime(row.closes_at)}</time></>}</dd></div>;
        })}</dl>}
      </section>
      <section className="space-information dashboard-card"><h2>Space rules</h2>{!space.rules.ok ? <p role="status" className="detail-empty">Space rules are temporarily unavailable.</p> : space.rules.rows.length ? <ol className="space-rules">{[...space.rules.rows].sort((a, b) => a.sort_order - b.sort_order).map(rule => <li key={rule.sort_order}><Check size={17} aria-hidden="true" /><span>{rule.rule_text}</span></li>)}</ol> : <p className="detail-empty">No space rules have been published yet.</p>}</section>
    </div>;
  return <div className="space-detail">
    <Link className="text-link catalog-back" href={catalogHref(filters)}><ArrowLeft size={16} aria-hidden="true" />Back to spaces</Link>
    <header className="catalog-heading space-detail-heading"><p className="catalog-eyebrow">{spaceTypes[space.type]}</p><h1>{space.name}</h1>
      <div className="space-meta"><span><MapPin size={16} aria-hidden="true" />Floor {space.floor}</span><span><Users size={17} aria-hidden="true" />{space.capacity} {space.capacity === 1 ? "person" : "people"}</span></div>
      {space.is_demo && <p className="detail-demo-note">Fictional portfolio space · Photos are illustrative.</p>}
    </header>
    <SpaceGallery key={space.id} name={space.name} images={space.images} />
    {booking ? <BookingExperience key={`${space.id}:${booking.initialSelection.date}:${booking.initialSelection.start}:${booking.initialSelection.end}`} {...booking} supplemental={supplemental}>{information}</BookingExperience> : <>{information}{supplemental}</>}
  </div>;
}
