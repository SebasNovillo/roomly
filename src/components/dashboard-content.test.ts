import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect,it,vi } from "vitest";
import { dashboardFixture } from "../../tests/fixtures/dashboard";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("@/features/spaces/components/space-photo",()=>({SpacePhoto:()=>null}));
import { DashboardContent } from "./dashboard-content";
const render=(mode:string)=>renderToStaticMarkup(createElement(DashboardContent,{name:"Verified member",now:"2026-10-26T18:00:00Z",result:dashboardFixture(mode)}));
it("renders truthful empty/one/ongoing states with the real supplied name and Chicago date",()=>{
  const empty=render("empty");expect(empty).toContain("Welcome back, Verified member");expect(empty).toContain("No upcoming bookings yet.");
  expect(empty).toContain("Monday, October 26, 2026");expect(empty).not.toContain("coming soon");
  expect(render("one")).toContain("You’re all set. No additional upcoming bookings.");
  const populated=render("multiple");expect(populated).toContain("Your current booking");expect(populated).toContain("In progress");expect(populated).toContain("1 hour");
  expect(populated).toContain("CDT");expect(populated).toContain("/dashboard/bookings?tab=upcoming");
  expect(populated).toContain("/dashboard/bookings?tab=past");expect(populated).toContain("/dashboard/bookings?tab=cancelled");
  expect(populated).toContain("/dashboard/spaces/atlas-meeting-room");expect(populated).toContain("/dashboard/reservations/");
});
it("keeps restricted space details generic while retaining owned booking facts",()=>{
  const html=render("missing");expect(html).toContain("Space details unavailable");expect(html).toContain("View booking details");
  expect(html).not.toContain("Atlas");expect(html).not.toContain(">View space");expect(html).toContain("BD000000-0000-4000-8000-000000000002");
});
it("distinguishes loading/error from empty while keeping useful navigation",()=>{
  const error=render("error"),loading=render("loading");expect(error).toContain("Try again");expect(error).toContain("Booking totals are unavailable");
  expect(loading).toContain("Loading your bookings");
  for(const html of [error,loading]) {expect(html).not.toContain("No upcoming bookings yet");expect(html).toContain("Manage bookings");expect(html).toContain("Find a space");}
});
