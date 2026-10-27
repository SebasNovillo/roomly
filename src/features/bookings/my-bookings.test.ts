import { describe,expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { bookingCategory,bookingStatus,bookingsHref,canCancel,parseBookingPage,reservationDateLabel,reservationDuration } from "./my-bookings";
import { ConfirmationView } from "./components/confirmation-view";

const now = "2026-10-26T18:00:00Z";
const row = {id:"bb000000-0000-4000-8000-000000000001",space_id:"bc000000-0000-4000-8000-000000000001",starts_at:"2026-10-26T19:00:00Z",ends_at:"2026-10-26T20:00:00Z",status:"confirmed" as const};
describe("booking categories and truthful persisted details",()=>{
  it.each([
    ["2026-10-26T17:59:59Z","past"],[now,"past"],["2026-10-26T18:00:01Z","upcoming"],
  ])("classifies the end boundary %s as %s",(ends_at,category)=>expect(bookingCategory({...row,ends_at},now)).toBe(category));
  it("keeps ongoing reservations Upcoming without making them cancellable",()=>{
    const ongoing = {...row,starts_at:now};
    expect(bookingCategory(ongoing,now)).toBe("upcoming"); expect(canCancel(ongoing,now)).toBe(false); expect(bookingStatus(ongoing,now)).toBe("In progress");
    expect(canCancel(row,now)).toBe(true);
  });
  it("keeps cancelled reservations in Cancelled regardless of date",()=>{
    for(const ends_at of ["2020-01-01T12:00:00Z","2090-01-01T12:00:00Z"]) {
      const cancelled={...row,ends_at,status:"cancelled" as const};
      expect(bookingCategory(cancelled,now)).toBe("cancelled"); expect(canCancel(cancelled,now)).toBe(false);
    }
  });
  it("validates URL tabs and bounded pagination",()=>{
    expect(parseBookingPage({tab:"past",page:"2"})).toEqual({tab:"past",page:2});
    expect(parseBookingPage({tab:"invalid",page:"-1"})).toEqual({tab:"upcoming",page:1});
    expect(bookingsHref("cancelled",2)).toBe("/dashboard/bookings?tab=cancelled&page=2");
  });
  it("formats persisted instants and real elapsed DST duration",()=>{
    expect(reservationDateLabel("2026-10-27T02:00:00Z")).toBe("Monday, October 26, 2026");
    expect(reservationDuration("2027-03-14T07:30:00Z","2027-03-14T08:30:00Z")).toBe("1 hour");
    expect(reservationDuration(row.starts_at,"2026-10-26T19:30:00Z")).toBe("30 minutes");
  });
  it.each([
    [{...row,ends_at:now},"Past booking","This reservation has ended."],
    [{...row,status:"cancelled" as const},"This booking was cancelled","This reservation is no longer active."],
    [{...row,starts_at:now},"Your booking is in progress","Your reserved time has started."],
  ])("does not present an old or cancelled row as newly confirmed",(reservation,title,description)=>{
    const html=renderToStaticMarkup(createElement(ConfirmationView,{reservation,space:null,now}));
    expect(html).toContain(title); expect(html).toContain(description); expect(html).not.toContain("Your booking is confirmed"); expect(html).toContain("Back to my bookings");
  });
});
