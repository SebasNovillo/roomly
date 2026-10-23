import { describe, expect, it } from "vitest";
import { parseFilters } from "@/features/spaces/catalog";
import { bookingHref, chicagoParts, dateSchema, daySegments, durationLabel, parseSelection, selectionIssue, todayChicago, wallInstant, type Day, type DayResult } from "./model";

const day: Day = { state:"open",now:"2027-01-05T12:00:00Z",opensAt:"2027-01-05T14:00:00Z",closesAt:"2027-01-06T02:00:00Z",occupied:[{ start:"2027-01-05T16:00:00Z",end:"2027-01-05T17:00:00Z",kind:"booked" },{ start:"2027-01-05T18:00:00Z",end:"2027-01-05T19:00:00Z",kind:"blocked" }] };
const result: DayResult = { ok:true,day };
const selection = { date:"2027-01-05",start:"08:00",end:"09:00" };
const now = Date.parse(day.now);
describe("booking rules and America/Chicago time",() => {
  it("validates actual calendar dates",() => { expect(dateSchema.safeParse("2027-02-29").success).toBe(false); expect(dateSchema.safeParse("2028-02-29").success).toBe(true); });
  it("uses IANA winter and summer offsets, independent of host timezone",() => {
    expect(new Date(wallInstant("2027-01-05","08:00")!).toISOString()).toBe("2027-01-05T14:00:00.000Z");
    expect(new Date(wallInstant("2027-07-05","08:00")!).toISOString()).toBe("2027-07-05T13:00:00.000Z");
    expect(todayChicago(new Date("2027-01-05T02:00:00Z"))).toBe("2027-01-04");
  });
  it("rejects skipped and repeated times and measures real DST duration",() => {
    expect(wallInstant("2027-03-14","02:30")).toBeNull();
    expect(wallInstant("2027-11-07","01:30")).toBeNull();
    expect(durationLabel({ date:"2027-03-14",start:"01:30",end:"03:30" })).toBe("1 hr");
    expect(chicagoParts(new Date("2027-03-14T08:30:00Z")).time).toBe("03:30");
  });
  it("accepts valid minimum durations and adjacent intervals",() => {
    expect(selectionIssue({ ...selection,end:"08:30" },result,now)).toBeNull();
    expect(selectionIssue({ ...selection,start:"09:00",end:"10:00" },result,now)).toBeNull();
    expect(selectionIssue({ ...selection,start:"11:00",end:"12:00" },result,now)).toBeNull();
  });
  it.each([
    [{...selection,start:"08:15"},"Select a date"],
    [{...selection,start:"09:00",end:"09:00"},"End time must"],
    [{...selection,start:"09:00",end:"08:30"},"End time must"],
    [{...selection,start:"07:30"},"opening hours"],
    [{...selection,start:"19:30",end:"20:30"},"opening hours"],
    [{...selection,start:"09:30",end:"10:30"},"no longer available"],
    [{...selection,start:"12:30",end:"13:30"},"no longer available"],
  ])("rejects invalid selection %j",(value,message) => expect(selectionIssue(value,result,now)).toContain(message));
  it("rejects past starts, missing hours, closed days and service failures distinctly",() => {
    expect(selectionIssue(selection,result,Date.parse("2027-01-05T14:00:00Z"))).toContain("future");
    expect(selectionIssue(selection,{ok:true,day:{state:"unconfigured",now:day.now}},now)).toContain("configured");
    expect(selectionIssue(selection,{ok:true,day:{state:"closed",now:day.now}},now)).toContain("closed");
    expect(selectionIssue(selection,{ok:false,kind:"service"},now)).toContain("temporarily unavailable");
  });
  it("creates honest daily segments without fabricating occupied periods",() => {
    const segments = daySegments(day,Date.parse("2027-01-05T14:45:00Z"));
    expect(segments.map(row=>row.kind)).toEqual(["past","available","booked","available","blocked","available"]);
    expect(segments[0].end).toBe(segments[1].start);
    expect(daySegments({state:"unconfigured",now:day.now},now)).toEqual([]);
  });
  it("preserves catalog filters and selections through detail/review links",() => {
    const filters = parseFilters({q:"Atlas",minCapacity:"8",amenity:["display","wi-fi"],page:"2"});
    const href = bookingHref("atlas-meeting-room",filters,selection,true,"test-key");
    const url = new URL(href,"http://localhost");
    expect(url.pathname).toBe("/dashboard/spaces/atlas-meeting-room/review");
    expect(url.searchParams.getAll("amenity")).toEqual(["display","wi-fi"]);
    expect(parseSelection(Object.fromEntries(url.searchParams))).toEqual(selection);
    expect(url.searchParams.get("q")).toBe("Atlas");
    expect(url.searchParams.get("page")).toBe("2");
  });
});
