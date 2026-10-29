import { expect } from "@playwright/test";
import path from "node:path";

export async function verifyDashboard(page,base,output) {
  for(const mode of ["multiple","empty","one","history","missing","error","loading"]) {
    for(const width of [1574,1056,768,390,320]) {
      await page.setViewportSize({width,height:1000});await page.goto(`${base}?fixtureDashboard=${mode}`);
      await expect(page.getByRole("heading",{name:"Welcome back, Dashboard test member",exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("link",{name:/Find a space/})).toHaveAttribute("href","/dashboard/spaces");
      await expect(page.getByRole("link",{name:/Manage bookings/})).toHaveAttribute("href","/dashboard/bookings");
      await expect(page.getByRole("link",{name:"View all bookings",exact:true})).toHaveAttribute("href","/dashboard/bookings?tab=upcoming");
      for(const tab of ["upcoming","past","cancelled"]) await expect(page.locator(`.overview-list a[href='/dashboard/bookings?tab=${tab}']`)).toBeVisible();
      if(mode === "multiple") {
        await expect(page.getByRole("heading",{name:"Your current booking",exact:true})).toBeVisible();
        await expect(page.locator(".dashboard-featured .booking-status")).toHaveText("In progress");
        await expect(page.locator(".dashboard-plans > li")).toHaveCount(3);
        await expect(page.locator(".overview-list dd").first()).toHaveText("15");
        await expect(page.getByRole("link",{name:"View booking details",exact:true})).toHaveAttribute("href","/dashboard/reservations/bd000000-0000-4000-8000-000000000002");
        await expect(page.getByRole("link",{name:"View space",exact:true})).toHaveAttribute("href","/dashboard/spaces/atlas-meeting-room");
        const links=await page.locator(".dashboard-plans a").evaluateAll(nodes=>nodes.map(node=>node.getAttribute("href")));
        expect(new Set(links).size).toBe(3);expect(links).not.toContain("/dashboard/reservations/bd000000-0000-4000-8000-000000000002");
        const image=page.locator(".dashboard-featured-photo img");await expect.poll(()=>image.evaluate(node=>node.complete && node.naturalWidth > 0)).toBe(true);
        if(width>=1024) {
          const main=await page.locator(".dashboard-primary").boundingBox(),side=await page.locator(".dashboard-secondary").boundingBox();
          expect(side.x).toBeGreaterThan(main.x+main.width);expect(Math.abs(main.y-side.y)).toBeLessThan(2);
          await page.getByRole("button",{name:"Collapse sidebar",exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await page.getByRole("button",{name:"Expand sidebar",exact:true}).click();
        }
      } else if(mode === "empty" || mode === "history") {
        await expect(page.getByRole("heading",{name:"Your next space is waiting",exact:true})).toBeVisible();
        await expect(page.getByText("No upcoming bookings yet.",{exact:true})).toBeVisible();await expect(page.locator(".overview-list dd").first()).toHaveText("0");
        if(mode === "history") {await expect(page.locator(".overview-list dd").nth(1)).toHaveText("1");await expect(page.locator(".overview-list dd").nth(2)).toHaveText("1");}
      } else if(mode === "one") {
        await expect(page.getByRole("heading",{name:"Your next booking",exact:true})).toBeVisible();
        await expect(page.getByText("You’re all set. No additional upcoming bookings.",{exact:true})).toBeVisible();
      } else if(mode === "missing") {
        await expect(page.locator(".dashboard-featured")).toContainText("Space details unavailable");await expect(page.getByRole("link",{name:"View space",exact:true})).toHaveCount(0);
        await expect(page.locator(".dashboard-featured-photo")).toContainText("Photo unavailable");
      } else {
        await expect(page.getByRole("heading",{name:mode === "error" ? "We couldn’t load your bookings" : "Loading your bookings…",exact:true})).toBeVisible();
        await expect(page.locator(".overview-list dd").first()).toContainText("—");
        await expect(page.getByText("No upcoming bookings yet.",{exact:true})).toHaveCount(0);
      }
      if((mode === "multiple" || mode === "empty") && (width===1574 || width===390)) await page.screenshot({path:path.join(output,`dashboard-${mode}-${width}.png`),fullPage:true});
    }
  }
  await page.goto(`${base}?fixtureDashboard=retry`);
  await page.getByRole("button",{name:"Try again",exact:true}).click();await expect(page.getByRole("heading",{name:"Your next booking",exact:true})).toBeVisible();
  const fixture=page.getByTestId("dashboard-fixture"),before=Number(await fixture.getAttribute("data-refreshes"));
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));await expect(fixture).toHaveAttribute("data-refreshes",String(before+1));
  await page.clock.install({time:new Date("2027-01-05T14:59:59.600Z")});
  await page.goto(`${base}?fixtureDashboard=boundary`);
  await expect(page.getByRole("heading",{name:"Your next booking",exact:true})).toBeVisible();
  await page.clock.fastForward(600);await expect(page.getByRole("heading",{name:"Your current booking",exact:true})).toBeVisible();
  await page.clock.fastForward(30*60*1000);await expect(page.getByRole("link",{name:"View booking details",exact:true})).toHaveAttribute("href","/dashboard/reservations/bd000000-0000-4000-8000-000000000002");
  await expect(page.locator(".overview-list dd").first()).toHaveText("1");
  await page.clock.resume();
  await page.goto(`${base}?fixtureDashboard=multiple`);
  await expect(page.getByRole("heading",{name:"Your current booking",exact:true})).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-fixture-auth-ready","true");
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent("fixture:auth",{detail:"different-fixture-owner"})));
  await expect(page.getByRole("heading",{name:"Your dashboard",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"View booking details",exact:true})).toHaveCount(0);
  await expect(page.locator(".overview-list dd").first()).toContainText("—");
  await page.goto(`${base}?fixtureDashboard=empty&fixtureAccount=different-fixture-owner`);
  await expect(page.getByText("No upcoming bookings yet.",{exact:true})).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-fixture-auth-ready","true");
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent("fixture:auth",{detail:null})));
  await expect(page.getByRole("heading",{name:"Your dashboard",exact:true})).toBeVisible();
  await expect(page.locator(".overview-list dd").first()).toContainText("—");
  console.log("PASS: isolated Dashboard — real components, full totals vs four visible entries, no/one/multiple/ongoing/error/loading/restricted metadata, links, desktop/mobile/sidebar, retry/refocus and start/end refresh boundaries. Fixtures only.");
}
