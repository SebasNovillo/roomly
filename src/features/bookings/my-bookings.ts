import { z } from "zod";
import { imageSchema, type SearchParams } from "@/features/spaces/catalog";
import { reservationSchema, TIMEZONE, type Reservation } from "./model";

export const bookingTabs = ["upcoming","past","cancelled"] as const;
export type BookingTab = typeof bookingTabs[number];
export const tabLabels = { upcoming:"Upcoming",past:"Past",cancelled:"Cancelled" };
export function parseBookingPage(params: SearchParams) {
  const tab = typeof params.tab === "string" && bookingTabs.includes(params.tab as BookingTab) ? params.tab as BookingTab : "upcoming";
  const page = typeof params.page === "string" && /^\d{1,7}$/.test(params.page) && +params.page >= 1 && +params.page <= 1_000_000 ? +params.page : 1;
  return { tab,page };
}
export function bookingsHref(tab: BookingTab, page = 1) {
  return `/dashboard/bookings?tab=${tab}${page > 1 ? `&page=${page}` : ""}`;
}
const count = z.number().int().nonnegative().safe();
export const bookingCardSchema = reservationSchema.extend({
  cancelled_at: z.iso.datetime({offset:true}).nullable(),
  space: z.object({ id:z.uuid(),slug:z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),name:z.string().min(1).max(120),floor:z.string().min(1).max(60),image:imageSchema.nullable() }).nullable(),
});
export type BookingCard = z.infer<typeof bookingCardSchema>;
export const bookingListSchema = z.object({
  now:z.iso.datetime({offset:true}),page:z.number().int().min(1).max(1_000_000),pageSize:z.literal(12),
  counts:z.object({upcoming:count,past:count,cancelled:count}),total:count,bookings:z.array(bookingCardSchema).max(12),
});
export type BookingList = z.infer<typeof bookingListSchema>;
export type BookingListResult = {ok:true;list:BookingList} | {ok:false;kind:"setup" | "service"};
export type CancellationState = {message?:string;cancelledId?:string};
export function bookingCategory(reservation: Reservation, now: string): BookingTab {
  return reservation.status === "cancelled" ? "cancelled" : Date.parse(reservation.ends_at) > Date.parse(now) ? "upcoming" : "past";
}
export function canCancel(reservation: Reservation, now: string) {
  return reservation.status === "confirmed" && Date.parse(reservation.starts_at) > Date.parse(now);
}
export function bookingStatus(reservation: Reservation, now: string) {
  if (reservation.status === "cancelled") return "Cancelled";
  if (Date.parse(reservation.ends_at) <= Date.parse(now)) return "Past";
  return Date.parse(reservation.starts_at) <= Date.parse(now) ? "In progress" : "Confirmed";
}
export function reservationDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US",{timeZone:TIMEZONE,weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date(value));
}
export function reservationDuration(start: string, end: string) {
  const minutes = Math.round((Date.parse(end)-Date.parse(start))/60_000);
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes/60), remainder = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",remainder ? `${remainder} minutes` : ""].filter(Boolean).join(" ");
}
