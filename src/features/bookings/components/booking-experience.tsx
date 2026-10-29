"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Info } from "lucide-react";
import type { CatalogFilters } from "@/features/spaces/catalog";
import { formatOpeningTime } from "@/features/spaces/details";
import { bookingHref, chicagoParts, dateLabel, daySchema, daySegments, selectionIssue, serviceMessage, timeLabel, todayChicago, userScheduleConflictMessage, type DayResult, type Selection } from "../model";
import { usePersonalSchedule } from "../use-personal-schedule";

export type BookingProps = { slug: string; filters: CatalogFilters; initialSelection: Selection; initialDay: DayResult };
const times = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2,"0")}:${i % 2 ? "30" : "00"}`);

export function BookingExperience({ slug, filters, initialSelection, initialDay, children, supplemental }: BookingProps & { children: ReactNode; supplemental?: ReactNode }) {
  const router = useRouter();
  const [selection, setSelection] = useState(initialSelection);
  const [result, setResult] = useState(initialDay);
  const [loading, setLoading] = useState(false);
  const [scheduleRevision,setScheduleRevision] = useState(0);
  const personal = usePersonalSchedule(selection,scheduleRevision);
  const [continuing, startTransition] = useTransition();
  const [now, setNow] = useState(() => initialDay.ok ? Date.parse(initialDay.day.now) : Date.now());
  useEffect(() => {
    let current: AbortController | undefined;
    let active = true;
    async function refresh() {
      current?.abort();
      const abort = new AbortController();
      current = abort;
      setLoading(true);
      try {
        const response = await fetch(`/dashboard/spaces/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(selection.date)}`, { signal: abort.signal, cache: "no-store" });
        const body: unknown = await response.json();
        const parsed = daySchema.safeParse(body);
        if (active && current === abort) {
          setResult(response.ok && parsed.success ? { ok: true, day: parsed.data } : { ok: false, kind: "service" });
          if (parsed.success) setNow(Date.parse(parsed.data.now));
        }
      } catch { if (active && current === abort) setResult({ ok: false, kind: "service" }); }
      finally { if (active && current === abort) setLoading(false); }
    }
    void refresh();
    const onFocus = () => { void refresh(); setScheduleRevision(value=>value+1); };
    const interval = setInterval(onFocus,30_000);
    window.addEventListener("focus",onFocus);
    return () => { active = false; current?.abort(); clearInterval(interval); window.removeEventListener("focus",onFocus); };
  }, [slug, selection.date]);
  useEffect(() => {
    const timer = setInterval(() => setNow(value => value + 1000),1000);
    return () => clearInterval(timer);
  }, []);
  const issue = selectionIssue(selection, result, now);
  const personalBlocked = personal.status === "pending" || personal.status === "conflict";
  const status = loading ? "Checking the latest availability…" : issue ?? (personal.status === "pending" ? "Checking your schedule…"
    : personal.status === "conflict" ? userScheduleConflictMessage
    : personal.status === "error" ? "Your schedule could not be checked. You can continue; it will be checked at confirmation."
    : "This space is available and no conflicts were found in your schedule. Both will be checked again at confirmation.");
  function change(key: keyof Selection, value: string) {
    const next = { ...selection, [key]: value };
    if (key === "date") setLoading(true);
    setScheduleRevision(value=>value+1);
    setSelection(next);
    window.history.replaceState(null, "", bookingHref(slug, filters, next));
  }
  return <div className="booking-detail-layout">
    <div className="booking-detail-content">{children}
      <section className="dashboard-card space-information daily-availability" aria-busy={loading}>
        <h2>Availability for {dateLabel(selection.date)}</h2>
        <p className="hours-timezone">All times in America/Chicago</p>
        {loading ? <p role="status" className="detail-empty">Checking availability…</p> : !result.ok ? <p role="status" className="detail-empty">{serviceMessage}</p> : result.day.state !== "open" ? <p className="detail-empty">{result.day.state === "closed" ? "Closed on this day." : result.day.state === "unconfigured" ? "Opening hours are not configured for this day. Booking is unavailable." : "Opening hours need clarification for this daylight-saving transition. Booking is unavailable."}</p> : <>
          <p className="hours-timezone">Open {timeLabel(result.day.opensAt)}–{timeLabel(result.day.closesAt)}</p>
          <ul className="availability-legend" aria-label="Availability legend">{["past","available","booked","blocked"].map(kind => <li key={kind} className={kind}>{kind}</li>)}</ul>
          <ol className="availability-ranges">{daySegments(result.day,now).map(range => <li key={range.start} className={range.kind}><span>{timeLabel(new Date(range.start).toISOString())}–{timeLabel(new Date(range.end).toISOString())}</span><strong>{range.kind}</strong></li>)}</ol>
          <p className="availability-note">This shows space availability. Your existing bookings may still conflict, and availability may change before confirmation.</p>
        </>}
      </section>
      {supplemental}
    </div>
    <aside className="dashboard-card choose-time">
      <h2>Choose your time</h2>
      <form onSubmit={event => {
        event.preventDefault();
        if (issue || loading || continuing || personalBlocked) return;
        // The review route creates and persists its request key on the server.
        // Browser randomUUID is unavailable over LAN HTTP.
        startTransition(() => router.push(bookingHref(slug, filters, selection, true)));
      }}>
        <label htmlFor="booking-date">Date</label>
        <input id="booking-date" type="date" min={todayChicago(new Date(now))} value={selection.date} required onChange={event => { if (event.target.value) change("date",event.target.value); }} />
        <div className="booking-time-fields">{(["start","end"] as const).map(key => <div key={key}>
          <label htmlFor={`booking-${key}`}>{key === "start" ? "Start time" : "End time"}</label>
          <select id={`booking-${key}`} value={selection[key]} required onChange={event => change(key,event.target.value)}>
            <option value="">Select</option>{times.map(time => <option key={time} value={time}>{formatOpeningTime(time)}</option>)}
          </select>
        </div>)}</div>
        <p className="booking-timezone"><Clock size={14} aria-hidden="true" />All times in America/Chicago</p>
        <div id="booking-selection-status" className={`booking-selection-status${!issue && !loading && personal.status === "clear" ? " selection-valid" : ""}${!issue && !loading && (personal.status === "conflict" || personal.status === "error") ? " selection-warning" : ""}`} role="status" aria-live="polite" aria-atomic="true">
          <Info size={16} aria-hidden="true" /><div><p>{status}</p>
            {!issue && !loading && personal.status === "conflict" && <ul className="personal-conflicts">{personal.conflicts.map(conflict=><li key={conflict.id}>
              <strong>{conflict.spaceName ?? "Existing booking"}</strong>
              <span>{dateLabel(chicagoParts(new Date(conflict.startsAt)).date)} · {timeLabel(conflict.startsAt)}–{timeLabel(conflict.endsAt)}</span>
              <Link className="text-link" href={`/dashboard/reservations/${conflict.id}`}>View existing booking</Link>
            </li>)}</ul>}
          </div>
        </div>
        <button className="auth-button" disabled={Boolean(issue) || loading || continuing || personalBlocked} aria-describedby="booking-selection-status">{continuing ? "Opening review…" : "Continue to booking"}</button>
        <p className="availability-note">Minimum 30 minutes. Choose times in 30-minute increments.</p>
      </form>
    </aside>
  </div>;
}
