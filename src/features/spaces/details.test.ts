import { expect, it } from "vitest";
import { formatOpeningTime, openingHoursSchema } from "./details";

it("distinguishes unconfigured days, explicitly closed days and configured hours", () => {
  expect(openingHoursSchema.parse([])).toEqual([]);
  expect(openingHoursSchema.safeParse([{ weekday: 0, is_closed: true, opens_at: null, closes_at: null }]).success).toBe(true);
  expect(openingHoursSchema.safeParse([{ weekday: 1, is_closed: false, opens_at: "08:00:00", closes_at: "20:00:00" }]).success).toBe(true);
  for (const [opens_at, closes_at] of [[null, null], ["20:00", "08:00"], ["08:00", "08:00"], ["08:00", "24:00"], ["08:00:30", "20:00"]]) {
    expect(openingHoursSchema.safeParse([{ weekday: 1, is_closed: false, opens_at, closes_at }]).success).toBe(false);
  }
  expect(openingHoursSchema.safeParse([{ weekday: 0, is_closed: true, opens_at: "08:00", closes_at: "10:00" }]).success).toBe(false);
  const closed = { weekday: 0, is_closed: true, opens_at: null, closes_at: null };
  expect(openingHoursSchema.safeParse([closed, closed]).success).toBe(false);
});

it.each([["00:00:00", "12:00 AM"], ["08:00:00", "8:00 AM"], ["12:00", "12:00 PM"], ["20:00", "8:00 PM"]])("formats local wall-clock time %s without timezone conversion", (time, label) => {
  expect(formatOpeningTime(time)).toBe(label);
});
