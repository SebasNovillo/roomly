import { expect } from "@playwright/test";
import path from "node:path";

export async function verifyBookingFlow(page,base,output) {
  const openDay = { state:"open",now:"2027-01-05T12:00:00Z",opensAt:"2027-01-05T14:00:00Z",closesAt:"2027-01-06T02:00:00Z",occupied:[{start:"2027-01-05T16:00:00Z",end:"2027-01-05T17:00:00Z",kind:"booked"},{start:"2027-01-05T18:00:00Z",end:"2027-01-05T19:00:00Z",kind:"blocked"}] };
  let responseDay = openDay;
  let serviceFailure = false;
  await page.route("**/availability?*",async route=>{
    await route.fulfill({status:serviceFailure ? 503 : 200,contentType:"application/json",body:JSON.stringify(serviceFailure ? {error:"unavailable"} : responseDay)});
  });
  const url = `${base}/atlas-meeting-room?q=Atlas&minCapacity=8&amenity=display&bookingPreview=1&date=2027-01-05`;
  for (const width of [1574,1056,390,320]) {
    await page.setViewportSize({width,height:1000}); await page.goto(url);
    await expect(page.getByRole("heading",{name:"Choose your time"})).toBeVisible();
    await expect(page.getByText("Checking availability…",{exact:true})).toHaveCount(0);
    await expect(page.locator(".availability-ranges .booked")).toHaveCount(1);
    await expect(page.locator(".availability-ranges .blocked")).toHaveCount(1);
    await page.getByLabel("Start time",{exact:true}).selectOption("09:00");
    await page.getByLabel("End time",{exact:true}).selectOption("10:00");
    await expect(page.getByRole("button",{name:"Continue to booking"})).toBeEnabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if(width >= 1024) {
      expect(await page.locator(".choose-time").evaluate(node=>getComputedStyle(node).position)).toBe("sticky");
      await page.locator(".choose-time").evaluate(node=>window.scrollTo(0,node.getBoundingClientRect().top+scrollY+120));
      await expect.poll(async()=>Math.round((await page.locator(".choose-time").boundingBox()).y)).toBe(28);
      await page.evaluate(()=>window.scrollTo(0,0));
    }
    if(width===1574) {
      await page.getByRole("button",{name:"Collapse sidebar",exact:true}).click();
      await expect(page.locator(".roomly-app")).toHaveClass(/sidebar-collapsed/);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button",{name:"Expand sidebar",exact:true}).click();
    }
    if(width ===1574 || width===390) await page.screenshot({path:path.join(output,`booking-${width===390 ? "mobile" : "desktop"}.png`),fullPage:true});
    await page.getByRole("button",{name:"Continue to booking"}).click();
    await expect(page.getByRole("heading",{name:"Review your booking"})).toBeVisible();
    expect(new URL(page.url()).searchParams.get("amenity")).toBe("display");
    await expect(page.locator(".booking-summary-details")).toContainText("1 hr");
    await expect(page.locator(".booking-summary-details")).toContainText("America/Chicago");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if(width===390) await page.screenshot({path:path.join(output,"booking-review-mobile.png"),fullPage:true});
    await page.getByRole("link",{name:"Change date or time"}).click();
    await expect(page.getByLabel("Start time",{exact:true})).toHaveValue("09:00");
    await expect(page.getByLabel("End time",{exact:true})).toHaveValue("10:00");
    await expect(page.getByRole("link",{name:"Back to spaces"})).toHaveAttribute("href",/q=Atlas&minCapacity=8&amenity=display/);
  }
  await page.getByLabel("Start time",{exact:true}).selectOption("09:30");
  await page.getByLabel("End time",{exact:true}).selectOption("10:30");
  await expect(page.getByRole("status").filter({hasText:"no longer available"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Continue to booking"})).toBeDisabled();
  await page.getByLabel("Start time",{exact:true}).selectOption("19:30");
  await page.getByLabel("End time",{exact:true}).selectOption("20:30");
  await expect(page.getByRole("status").filter({hasText:"entirely within opening hours"})).toBeVisible();
  responseDay = {state:"unconfigured",now:openDay.now};
  await page.getByLabel("Date",{exact:true}).fill("2027-01-06");
  await expect(page.locator(".daily-availability")).toContainText("not configured");
  await expect(page.locator(".availability-ranges")).toHaveCount(0);
  responseDay = {state:"closed",now:openDay.now};
  await page.getByLabel("Date",{exact:true}).fill("2027-01-07");
  await expect(page.locator(".daily-availability")).toContainText("Closed on this day");
  serviceFailure = true;
  await page.getByLabel("Date",{exact:true}).fill("2027-01-08");
  await expect(page.locator(".daily-availability")).toContainText("temporarily unavailable");
  await expect(page.getByRole("button",{name:"Continue to booking"})).toBeDisabled();
  serviceFailure = false; responseDay = openDay;
  const review = `${base}/atlas-meeting-room/review?date=2027-01-05&start=09%3A00&end=10%3A00&request=bb000000-0000-4000-8000-000000000001`;
  for(const error of ["conflict","service"]) {
    await page.goto(`${review}&fixtureConfirm=${error}`);
    await page.getByRole("button",{name:"Confirm booking",exact:true}).click();
    await expect(page.getByRole("button",{name:"Confirming booking…"})).toBeDisabled();
    await expect(page.getByRole("alert")).toContainText(error === "conflict" ? "just taken" : "temporarily unavailable");
    await expect(page.getByRole("heading",{name:"Your booking is confirmed"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Confirm booking",exact:true})).toBeEnabled();
  }
  await page.goto(review);
  await page.getByRole("button",{name:"Confirm booking",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Your booking is confirmed"})).toBeVisible();
  await expect(page.getByText("BB000000-0000-4000-8000-000000000001",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"View space",exact:true})).toHaveAttribute("href","/dashboard/spaces/atlas-meeting-room");
  await expect(page.getByRole("link",{name:"Explore more spaces"})).toHaveAttribute("href","/dashboard/spaces");
  for(const width of [1574,390,320]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if(width !== 320) await page.screenshot({path:path.join(output,`booking-confirmation-${width===390 ? "mobile" : "desktop"}.png`),fullPage:true});
  }
  console.log("PASS: isolated booking UI — responsive panel, occupied ranges, selection/review/back/filter preservation, validation, unconfigured/closed/service states, pending/conflict/error and fixture confirmation. No real bookings.");
}
