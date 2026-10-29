import { expect,it } from "vitest";
import { dashboardList } from "../../../tests/fixtures/dashboard";
import { dashboardRefreshDelay, upcomingDashboardCards } from "./model";

it("features the earliest not-ended confirmed booking including ongoing, then three distinct plans",()=>{
  const list=dashboardList(),cards=upcomingDashboardCards(list);
  expect(cards).toHaveLength(4);expect(cards[0].starts_at).toBe("2026-10-26T17:30:00Z");
  expect(new Set(cards.map(row=>row.id)).size).toBe(4);
  expect(list.counts).toEqual({upcoming:15,past:1,cancelled:1});expect(list.bookings).toHaveLength(12);
});
it("excludes ended/cancelled and duplicate records even if a malformed list supplies them",()=>{
  const list=dashboardList();
  const first=list.bookings[0];
  list.bookings=[{...first,status:"cancelled"}, {...first,id:"bf220000-0000-4000-8000-000000000030",ends_at:list.now},first,first];
  expect(upcomingDashboardCards(list)).toEqual([first]);
  expect(upcomingDashboardCards(dashboardList("empty"))).toEqual([]);
  expect(upcomingDashboardCards(dashboardList("one"))).toHaveLength(1);
});
it("refreshes at start/end boundaries or once a minute, without rapid looping",()=>{
  const list=dashboardList("boundary","2027-01-05T14:59:59.600Z");
  expect(dashboardRefreshDelay(list.now,list.bookings)).toBe(500);
  expect(dashboardRefreshDelay("2027-01-05T15:29:59.600Z",list.bookings)).toBe(500);
  expect(dashboardRefreshDelay("2027-01-05T15:01:00Z",list.bookings)).toBe(60_000);
  expect(dashboardRefreshDelay(list.now,[])).toBe(60_000);
});
