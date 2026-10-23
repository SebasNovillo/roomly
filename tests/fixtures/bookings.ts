import { type DayResult } from "../../src/features/bookings/model";
export const bookingFixtureSelection = { date:"2027-01-05",start:"09:00",end:"10:00" };
export const bookingFixtureId = "bb000000-0000-4000-8000-000000000001";
export const bookingFixtureDay: DayResult = { ok:true,day:{ state:"open",now:"2027-01-05T12:00:00Z",opensAt:"2027-01-05T14:00:00Z",closesAt:"2027-01-06T02:00:00Z",occupied:[
  { start:"2027-01-05T16:00:00Z",end:"2027-01-05T17:00:00Z",kind:"booked" },
  { start:"2027-01-05T18:00:00Z",end:"2027-01-05T19:00:00Z",kind:"blocked" },
] } };
