// Explicit Dashboard fixtures only; never imported by production application.
import { myBookingFixtures, myBookingsNow } from "./my-bookings";
import { bookingCategory, type BookingList } from "../../src/features/bookings/my-bookings";
import { upcomingDashboardCards, type DashboardResult } from "../../src/features/dashboard/model";

export function dashboardList(mode="multiple", now=myBookingsNow): BookingList {
  let rows=[myBookingFixtures[1],...Array.from({length:14},(_,index)=>({...myBookingFixtures[0],
    id:`bf220000-0000-4000-8000-${String(index+1).padStart(12,"0")}`,
    starts_at:`2027-01-${String(index+5).padStart(2,"0")}T15:00:00Z`,ends_at:`2027-01-${String(index+5).padStart(2,"0")}T15:30:00Z`,
  })),myBookingFixtures[2],myBookingFixtures[3]];
  if(mode === "empty") rows=[];
  if(mode === "one") rows=[rows[1]];
  if(mode === "history") rows=[myBookingFixtures[2],myBookingFixtures[3]];
  if(mode === "missing") rows=rows.map(row=>({...row,space:null}));
  if(mode === "boundary") rows=[
    {...myBookingFixtures[0],starts_at:"2027-01-05T15:00:00Z",ends_at:"2027-01-05T15:30:00Z"},
    {...myBookingFixtures[1],starts_at:"2027-01-05T15:30:00Z",ends_at:"2027-01-05T16:00:00Z"},
  ];
  const counts={upcoming:0,past:0,cancelled:0};rows.forEach(row=>counts[bookingCategory(row,now)]++);
  const selected=rows.filter(row=>bookingCategory(row,now) === "upcoming").sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at) || a.id.localeCompare(b.id));
  return {now,page:1,pageSize:12,counts,total:counts.upcoming,bookings:selected.slice(0,12)};
}
export function dashboardFixture(mode:string, now?:string): DashboardResult | null {
  if(mode === "error") return {ok:false,kind:"service"};
  if(mode === "loading") return null;
  const list=dashboardList(mode,now),cards=upcomingDashboardCards(list);
  return {ok:true,dashboard:{now:list.now,counts:list.counts,featured:cards[0] ?? null,plans:cards.slice(1),spaceTypes:mode === "missing" ? {} : {[myBookingFixtures[0].space_id]:"meeting-room"}}};
}
