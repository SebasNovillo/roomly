import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { spaceTypes, type Space } from "@/features/spaces/catalog";
import { SpacePhoto } from "@/features/spaces/components/space-photo";
import { dateLabel, durationLabel, timeLabel, wallInstant, type Selection, type Reservation } from "../model";
import { reservationDuration } from "../my-bookings";

export function BookingSummary({ space, selection, instants }: { space: Space; selection: Selection; instants?: Pick<Reservation,"starts_at" | "ends_at"> }) {
  const start = instants ? Date.parse(instants.starts_at) : wallInstant(selection.date,selection.start), end = instants ? Date.parse(instants.ends_at) : wallInstant(selection.date,selection.end);
  return <section className="dashboard-card booking-summary">
    <div className="booking-summary-photo"><SpacePhoto image={space.images[0]} /></div>
    <div className="booking-summary-body"><p className="space-type">{spaceTypes[space.type]}</p><h2>{space.name}</h2>
      <div className="space-meta"><span><MapPin size={16} aria-hidden="true" />Floor {space.floor}</span><span><Users size={16} aria-hidden="true" />{space.capacity} people</span></div>
      <dl className="booking-summary-details">
        <div><dt><CalendarDays size={17} aria-hidden="true" />Date</dt><dd>{dateLabel(selection.date)}</dd></div>
        <div><dt><Clock size={17} aria-hidden="true" />Time</dt><dd>{start !== null && end !== null ? `${timeLabel(new Date(start).toISOString())}–${timeLabel(new Date(end).toISOString())}` : "Select another time"}</dd></div>
        <div><dt>Duration</dt><dd>{instants ? reservationDuration(instants.starts_at,instants.ends_at) : durationLabel(selection)}</dd></div><div><dt>Timezone</dt><dd>America/Chicago</dd></div>
      </dl>
    </div>
  </section>;
}
