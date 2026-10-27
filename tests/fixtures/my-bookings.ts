// Test-only persisted-record shapes, never imported by application routes.
import { portfolioSpaces } from "./spaces";
import { bookingCategory, type BookingCard, type BookingListResult, type BookingTab } from "../../src/features/bookings/my-bookings";
export const myBookingsNow = "2026-10-26T18:00:00Z";
export const cancellableFixtureId = "bd000000-0000-4000-8000-000000000001";
const space = portfolioSpaces[0];
const metadata={id:space.id,slug:space.slug,name:space.name,floor:space.floor,image:space.images[0]};
export const myBookingFixtures: BookingCard[] = [
  {id:cancellableFixtureId,space_id:space.id,starts_at:"2026-10-27T19:00:00Z",ends_at:"2026-10-27T19:30:00Z",status:"confirmed",cancelled_at:null,space:metadata},
  {id:"bd000000-0000-4000-8000-000000000002",space_id:space.id,starts_at:"2026-10-26T17:30:00Z",ends_at:"2026-10-26T18:30:00Z",status:"confirmed",cancelled_at:null,space:metadata},
  {id:"bd000000-0000-4000-8000-000000000003",space_id:space.id,starts_at:"2026-10-23T19:00:00Z",ends_at:"2026-10-23T19:30:00Z",status:"confirmed",cancelled_at:null,space:metadata},
  {id:"bd000000-0000-4000-8000-000000000004",space_id:space.id,starts_at:"2026-10-28T19:00:00Z",ends_at:"2026-10-28T19:30:00Z",status:"cancelled",cancelled_at:"2026-10-25T18:00:00Z",space:metadata},
];
export function myBookingsFixture(tab:BookingTab,page:number,cancelledIds:string[],mode:string|null):BookingListResult {
  if(mode === "service" || mode === "setup") return {ok:false,kind:mode};
  let rows=myBookingFixtures.map(row=>cancelledIds.includes(row.id) ? {...row,status:"cancelled" as const,cancelled_at:myBookingsNow} : {...row});
  if(mode === "empty") rows=[];
  if(mode === "missing-space") rows=rows.map(row=>({...row,space:null}));
  if(mode === "pagination") rows=Array.from({length:14},(_,index)=>({...myBookingFixtures[0],id:`be000000-0000-4000-8000-${String(index+1).padStart(12,"0")}`,starts_at:`2027-01-${String(index+1).padStart(2,"0")}T19:00:00Z`,ends_at:`2027-01-${String(index+1).padStart(2,"0")}T19:30:00Z`}));
  const counts={upcoming:0,past:0,cancelled:0};
  rows.forEach(row=>counts[bookingCategory(row,myBookingsNow)]++);
  const selected=rows.filter(row=>bookingCategory(row,myBookingsNow) === tab).sort((a,b)=>tab === "upcoming" ? Date.parse(a.starts_at)-Date.parse(b.starts_at) : tab === "past" ? Date.parse(b.starts_at)-Date.parse(a.starts_at) : Date.parse(b.cancelled_at ?? "1970-01-01Z")-Date.parse(a.cancelled_at ?? "1970-01-01Z"));
  return {ok:true,list:{now:myBookingsNow,page,pageSize:12,counts,total:selected.length,bookings:selected.slice((page-1)*12,page*12)}};
}
