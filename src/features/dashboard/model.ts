import type { SpaceType } from "@/features/spaces/catalog";
import { bookingCategory, type BookingCard, type BookingList } from "@/features/bookings/my-bookings";

export type DashboardSnapshot = {
  now:string; counts:BookingList["counts"]; featured:BookingCard | null; plans:BookingCard[];
  spaceTypes:Partial<Record<string,SpaceType>>;
};
export type DashboardResult = {ok:true;dashboard:DashboardSnapshot} | {ok:false;kind:"setup" | "service"};
export function upcomingDashboardCards(list: BookingList) {
  const seen=new Set<string>();
  return list.bookings.filter(booking=>{
    if(bookingCategory(booking,list.now) !== "upcoming" || seen.has(booking.id)) return false;
    seen.add(booking.id);return true;
  }).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at) || a.id.localeCompare(b.id)).slice(0,4);
}
export function dashboardRefreshDelay(now: string, bookings: BookingCard[]) {
  const boundary=Date.parse(now);
  return Math.max(250,Math.min(60_000,...bookings.flatMap(booking=>[Date.parse(booking.starts_at),Date.parse(booking.ends_at)])
    .filter(value=>value>boundary).map(value=>value-boundary+100)));
}
