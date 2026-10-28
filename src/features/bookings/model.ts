import { z } from "zod";
import { filterQuery, type CatalogFilters, type SearchParams } from "@/features/spaces/catalog";

export const TIMEZONE = "America/Chicago";
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|30)$/);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0,10) === value && value >= "2000-01-01" && value <= "9998-12-31";
});
export const selectionSchema = z.object({ date: dateSchema, start: clock, end: clock });
export type Selection = z.infer<typeof selectionSchema>;
export const reservationSchema = z.object({ id: z.uuid(), space_id: z.uuid(), starts_at: z.iso.datetime({ offset: true }), ends_at: z.iso.datetime({ offset: true }), status: z.enum(["confirmed", "cancelled"]) });
export type Reservation = z.infer<typeof reservationSchema>;
const instant = z.iso.datetime({ offset: true });
export const daySchema = z.discriminatedUnion("state", [
  z.object({ state: z.enum(["unconfigured", "closed", "dst"]), now: instant }),
  z.object({ state: z.literal("open"), now: instant, opensAt: instant, closesAt: instant,
    occupied: z.array(z.object({ start: instant, end: instant, kind: z.enum(["booked", "blocked"]) })) }),
]);
export type Day = z.infer<typeof daySchema>;
export type DayResult = { ok: true; day: Day } | { ok: false; kind: "setup" | "service" };
export type BookingState = { message?: string; conflict?: "user-schedule" };
export const userScheduleConflictMessage = "You already have a booking during this time. Choose another time or manage your existing booking.";
export const serviceMessage = "Booking is temporarily unavailable. Please try again later.";

const localFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function chicagoParts(instant: Date) {
  const parts = Object.fromEntries(localFormatter.formatToParts(instant).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
export const todayChicago = (now = new Date()) => chicagoParts(now).date;
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}
export function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}
// Resolve IANA wall times without the machine timezone or a fixed UTC offset.
// Repeated fall-back times and nonexistent spring-forward times are rejected.
export function wallInstant(date: string, time: string): number | null {
  if (!dateSchema.safeParse(date).success || !clock.safeParse(time).success) return null;
  const guess = Date.parse(`${date}T${time}:00Z`);
  const matches: number[] = [];
  for (let step = -36; step <= 36; step++) {
    const candidate = guess + step * 30 * 60_000;
    const local = chicagoParts(new Date(candidate));
    if (local.date === date && local.time === time) matches.push(candidate);
  }
  return matches.length === 1 ? matches[0] : null;
}
export function selectionIssue(selection: Partial<Selection>, result: DayResult, now: number): string | null {
  if (!selectionSchema.safeParse(selection).success) return "Select a date, start time, and end time.";
  if (!result.ok) return serviceMessage;
  const day = result.day;
  if (day.state === "unconfigured") return "Booking is unavailable until opening hours are configured for this day.";
  if (day.state === "closed") return "This space is closed on this day. Choose another date.";
  if (day.state === "dst") return "Opening hours cross an ambiguous daylight-saving time. Choose another date.";
  if (day.state !== "open") return serviceMessage;
  const start = wallInstant(selection.date!, selection.start!);
  const end = wallInstant(selection.date!, selection.end!);
  if (start === null || end === null) return "This time is skipped or repeated by daylight saving. Choose another time.";
  if (start <= now) return "Start time must be in the future.";
  if (end - start < 30 * 60_000 || selection.end! <= selection.start!) return "End time must follow start time by at least 30 minutes.";
  if (start < Date.parse(day.opensAt) || end > Date.parse(day.closesAt)) return "Choose a time entirely within opening hours.";
  if (day.occupied.some(range => start < Date.parse(range.end) && end > Date.parse(range.start))) return "This time is no longer available. Choose another time.";
  return null;
}
export function parseSelection(params: SearchParams): Selection {
  const first = (value: string | string[] | undefined) => typeof value === "string" ? value : value?.[0] ?? "";
  const date = first(params.date);
  return { date: dateSchema.safeParse(date).success ? date : todayChicago(), start: first(params.start), end: first(params.end) };
}
export function bookingHref(slug: string, filters: CatalogFilters, selection: Selection, review = false, request?: string) {
  const query = new URLSearchParams(filterQuery(filters));
  query.set("date", selection.date);
  if (selection.start) query.set("start", selection.start);
  if (selection.end) query.set("end", selection.end);
  if (request) query.set("request", request);
  return `/dashboard/spaces/${encodeURIComponent(slug)}${review ? "/review" : ""}?${query}`;
}
export function durationLabel(selection: Selection) {
  const start = wallInstant(selection.date, selection.start), end = wallInstant(selection.date, selection.end);
  if (start === null || end === null) return "—";
  const minutes = (end - start) / 60_000;
  return `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} hr ` : ""}${minutes % 60 ? `${minutes % 60} min` : ""}`.trim();
}
export function daySegments(day: Day, now: number) {
  if (day.state !== "open") return [];
  const start = Date.parse(day.opensAt), end = Date.parse(day.closesAt);
  const points = [...new Set([start, end, Math.max(start, Math.min(end, now)), ...day.occupied.flatMap(range => [Math.max(start,Math.min(end,Date.parse(range.start))),Math.max(start,Math.min(end,Date.parse(range.end)))])])].sort((a,b) => a-b);
  const result: { start: number; end: number; kind: "past" | "available" | "booked" | "blocked" }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i+1];
    if (b <= a) continue;
    const ranges = day.occupied.filter(range => Date.parse(range.start) < b && Date.parse(range.end) > a);
    const kind = b <= now ? "past" : ranges.some(range => range.kind === "blocked") ? "blocked" : ranges.length ? "booked" : "available";
    const previous = result.at(-1);
    if (previous?.kind === kind) previous.end = b;
    else result.push({ start: a, end: b, kind });
  }
  return result;
}
