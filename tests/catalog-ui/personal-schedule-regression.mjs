import { expect } from "@playwright/test";
import path from "node:path";

export async function verifyPersonalSchedule(page,base,output) {
  const conflicts=[
    {id:"bb000000-0000-4000-8000-000000000001",spaceName:"Horizon Conference Room",startsAt:"2027-01-05T15:00:00Z",endsAt:"2027-01-05T15:30:00Z"},
    {id:"bb000000-0000-4000-8000-000000000002",spaceName:null,startsAt:"2027-01-05T15:30:00Z",endsAt:"2027-01-05T16:00:00Z"},
  ];
  let mode="conflict",slowStarted=false;
  const handler=async route=>{
    const start=new URL(route.request().url()).searchParams.get("start");
    const slow=mode === "race" && start === "14:00";
    const state=mode;
    if(slow) slowStarted=true;
    await new Promise(resolve=>setTimeout(resolve,slow ? 1000 : 350));
    try {
      await route.fulfill({status:state === "error" ? 503 : 200,contentType:"application/json",body:JSON.stringify(state === "error" ? {error:"unavailable"} : {conflicts:state === "clear" || slow ? [] : conflicts})});
    } catch { /* Selection changes/unmount abort the pending request. */ }
  };
  await page.route("**/dashboard/schedule-conflicts?*",handler);
  const url=`${base}/atlas-meeting-room?q=Atlas&minCapacity=8&amenity=display&date=2027-01-05&start=09%3A00&end=10%3A00`;
  const button=page.getByRole("button",{name:"Continue to booking",exact:true});
  const status=page.locator("#booking-selection-status");
  try {
    for(const width of [1574,390,320]) {
      await page.setViewportSize({width,height:1000});await page.goto(url);
      await expect(status).toContainText("Checking your schedule");await expect(button).toBeDisabled();
      await expect(status).toContainText("You already have a booking during this time");
      await expect(button).toBeDisabled();await expect(status).not.toHaveClass(/selection-valid/);
      await expect(status).toContainText("Horizon Conference Room");await expect(status).toContainText("Existing booking");
      await expect(status).toContainText("9:00 AM CST–9:30 AM CST");
      await expect(status.getByRole("link",{name:"View existing booking",exact:true})).toHaveCount(2);
      await expect(status.getByRole("link").first()).toHaveAttribute("href","/dashboard/reservations/bb000000-0000-4000-8000-000000000001");
      await expect(page.locator(".availability-ranges .booked")).toHaveCount(1); // Room ranges are unaffected.
      await expect(page.getByLabel("Start time",{exact:true})).toBeEnabled();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if(width !== 320) await page.screenshot({path:path.join(output,`personal-conflict-${width}.png`),fullPage:true});
    }
    mode="clear";
    await page.getByLabel("Start time",{exact:true}).selectOption("13:00");
    await expect(status.getByRole("link")).toHaveCount(0);
    await page.getByLabel("End time",{exact:true}).selectOption("13:30");
    await expect(status).toContainText("Checking your schedule");await expect(button).toBeDisabled();
    await expect(button).toBeEnabled();await expect(status).toHaveClass(/selection-valid/);
    await button.click();await expect(page.getByRole("heading",{name:"Review your booking",exact:true})).toBeVisible();
    // Another booking can arrive after the clear preliminary result.
    await page.goto(`${page.url()}&fixtureConfirm=user-schedule`);
    await page.getByRole("button",{name:"Confirm booking",exact:true}).click();
    await expect(page.getByRole("alert")).toContainText("You already have a booking during this time");
    await expect(page.getByRole("heading",{name:"Your booking is confirmed"})).toHaveCount(0);
    await page.getByRole("link",{name:"Change date or time",exact:true}).click();
    await expect(button).toBeEnabled();
    // Failed checks are explicitly unknown, while room validations still apply.
    mode="error";await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
    await expect(status).toContainText("could not be checked");await expect(button).toBeEnabled();
    await expect(status).not.toHaveClass(/selection-valid/);
    await button.click();await expect(page.getByRole("heading",{name:"Review your booking",exact:true})).toBeVisible();
    expect(new URL(page.url()).searchParams.get("amenity")).toBe("display");
    await page.getByRole("link",{name:"Change date or time",exact:true}).click();
    await expect(status).toContainText("could not be checked");
    await page.getByLabel("Start time",{exact:true}).selectOption("09:30");
    await page.getByLabel("End time",{exact:true}).selectOption("10:30");
    await expect(status).toContainText("no longer available");await expect(button).toBeDisabled();
    const roomFailure=route=>route.fulfill({status:503,contentType:"application/json",body:'{"error":"unavailable"}'});
    await page.route("**/availability?*",roomFailure);
    await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
    await expect(status).toContainText("Booking is temporarily unavailable");await expect(button).toBeDisabled();
    await page.unroute("**/availability?*",roomFailure);
    await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
    // A slow empty result for an earlier selection must never erase a newer conflict.
    mode="race";
    await page.getByLabel("Start time",{exact:true}).selectOption("14:00");
    await page.getByLabel("End time",{exact:true}).selectOption("14:30");
    await expect.poll(()=>slowStarted).toBe(true);
    await page.getByLabel("Start time",{exact:true}).selectOption("13:00");
    await expect(status).toContainText("You already have a booking during this time");
    await page.waitForTimeout(1100);
    await expect(button).toBeDisabled();await expect(status.getByRole("link")).toHaveCount(2);
    mode="clear";await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
    await expect(button).toBeEnabled();await expect(status).toHaveClass(/selection-valid/);
    // Unmount with a delayed request; the runner also asserts no page errors.
    mode="race";slowStarted=false;
    await page.getByLabel("Start time",{exact:true}).selectOption("14:00");
    await expect.poll(()=>slowStarted).toBe(true);await page.goto(base);
    await expect(page.getByText("6 spaces found",{exact:true})).toBeVisible();
    console.log("PASS: personal schedule UI — pending/conflict/clear/failed checks, multiple private detail links, missing names, Chicago times, controls/correction, room separation, focus refresh, stale/aborted/unmounted requests, desktop/mobile and filter-preserving review. No hosted bookings.");
  } finally {await page.unroute("**/dashboard/schedule-conflicts?*",handler);}
}
