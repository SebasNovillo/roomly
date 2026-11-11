"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { CalendarDays, Check, ChevronDown, Clock3, Search, Users } from "lucide-react";
import { rooms } from "./rooms";

const steps = [
  { title: "Find a space", description: "Search by room, capacity, or amenities to narrow the options." },
  { title: "Choose your time", description: "Pick a date and time, then check the room’s schedule." },
  { title: "Review your booking", description: "Confirm the room, date, duration, and member details in one place." },
];

function PreviewPhoto({ index = 0 }: { index?: number }) {
  const room = rooms[index];
  return <Image src={`/images/spaces/${room.slug}.jpg`} alt={room.alt} width={900} height={600} sizes="(max-width: 767px) 50vw, 350px" />;
}

function SearchIllustration() {
  return <><p className="landing-eyebrow">Your space, your schedule</p><h3>Find your next space</h3>
    <div className="landing-search-illustration" aria-hidden="true"><p>Search</p><div className="landing-fake-search"><Search size={15} />Search spaces</div><div className="landing-fake-filters">{["Any capacity", "All space types", "Any amenities"].map(label => <span key={label}>{label}<ChevronDown size={12} /></span>)}</div></div>
    <div className="landing-preview-rooms">{rooms.slice(0, 2).map((room, index) => <div key={room.slug}><PreviewPhoto index={index} /><div><p className="landing-eyebrow">{room.type}</p><h4>{room.name}</h4><p className="landing-capacity"><Users size={14} aria-hidden="true" />{room.capacity} people</p></div></div>)}</div>
  </>;
}

function TimeIllustration() {
  return <><p className="landing-eyebrow">A time that works for you</p><h3>Choose your time</h3>
    <div className="landing-time-room"><PreviewPhoto /><div><h4>Atlas Meeting Room</h4><p className="landing-capacity"><Users size={14} aria-hidden="true" />Up to 8 people</p></div></div>
    <div className="landing-time-fields"><div><span><CalendarDays size={15} />Date</span><strong>November 13, 2026</strong></div><div><span><Clock3 size={15} />Time</span><strong>10:00–11:00 AM</strong></div></div>
    <div className="landing-schedule"><h4>Room availability</h4><p>Friday, November 13 · America/Chicago</p><div className="landing-schedule-slots"><span>9:00 AM<br /><b>Available</b></span><span className="selected">10:00 AM<br /><b>Selected</b></span><span>11:00 AM<br /><b>Available</b></span></div><p className="landing-available"><Check size={15} />This illustrative time is available.</p></div>
  </>;
}

function ReviewIllustration() {
  return <><p className="landing-eyebrow">All the details in one place</p><h3>Review your booking</h3>
    <div className="landing-review-card"><PreviewPhoto /><div><h4>Atlas Meeting Room</h4><p className="landing-capacity"><Users size={14} aria-hidden="true" />Up to 8 people · Floor 2</p><dl>{[["Date", "Friday, November 13, 2026"], ["Time", "10:00–11:00 AM"], ["Duration", "1 hour"], ["Member", "Alex Morgan"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></div>
  </>;
}

export function BookingPreview() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowDown": case "ArrowRight": next = (index + 1) % steps.length; break;
      case "ArrowUp": case "ArrowLeft": next = (index + steps.length - 1) % steps.length; break;
      case "Home": next = 0; break;
      case "End": next = steps.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }
  return <div className="landing-preview-layout">
    <div role="tablist" aria-label="Booking preview steps" aria-orientation="vertical" className="landing-step-list">{steps.map((step, index) => <button key={step.title} ref={node => { tabs.current[index] = node; }} role="tab" id={`booking-step-${index}`} aria-selected={selected === index} aria-controls={`booking-panel-${index}`} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => onKeyDown(event, index)}><span className="landing-step-number">0{index + 1}</span><span><strong>{step.title}</strong><span>{step.description}</span></span></button>)}</div>
    {steps.map((step, index) => <div key={step.title} role="tabpanel" id={`booking-panel-${index}`} aria-labelledby={`booking-step-${index}`} hidden={selected !== index} tabIndex={0} className="landing-interface-preview">
      {index === 0 ? <SearchIllustration /> : index === 1 ? <TimeIllustration /> : <ReviewIllustration />}
      <p className="landing-preview-note">Illustrative preview · No reservation will be created.</p>
    </div>)}
  </div>;
}
