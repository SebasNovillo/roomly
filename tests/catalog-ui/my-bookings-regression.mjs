import { expect } from "@playwright/test";
import path from "node:path";
const id="bd000000-0000-4000-8000-000000000001";
export async function verifyMyBookings(page,base,output) {
  for(const width of [1574,1056,768,390,320]) {
    await page.setViewportSize({width,height:1000});await page.goto(base);
    await expect(page.getByRole("heading",{name:"My bookings",exact:true})).toBeVisible();
    await expect(page.getByRole("tab",{name:"Upcoming 2",exact:true})).toHaveAttribute("aria-selected","true");
    await expect(page.locator(".booking-list-card")).toHaveCount(2);
    await expect(page.getByText("In progress",{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Cancel booking",exact:true})).toHaveCount(1);
    await expect(page.locator(".booking-list-card").filter({hasText:"In progress"}).getByRole("button",{name:"Cancel booking"})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if(width===1574 || width===390) await page.screenshot({path:path.join(output,`my-bookings-${width===390 ? "mobile" : "desktop"}.png`),fullPage:true});
    const trigger=page.getByRole("button",{name:"Cancel booking",exact:true});await trigger.click();
    const dialog=page.getByRole("dialog",{name:"Cancel this booking?"});await expect(dialog).toBeVisible();
    const keep=dialog.getByRole("button",{name:"Keep booking"});const cancel=dialog.getByRole("button",{name:"Cancel booking",exact:true});
    await expect(keep).toBeFocused();await page.keyboard.press("Shift+Tab");await expect(cancel).toBeFocused();
    await page.keyboard.press("Tab");await expect(keep).toBeFocused();
    await page.keyboard.press("Tab");await expect(cancel).toBeFocused();
    await page.keyboard.press("Tab");await expect(keep).toBeFocused();
    if(width===1574 || width===390) await page.screenshot({path:path.join(output,`cancel-dialog-${width===390 ? "mobile" : "desktop"}.png`)});
    await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
    await trigger.click();await keep.click();await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
    await expect(page.getByRole("tab",{name:"Upcoming 2",exact:true})).toBeVisible();
    await page.getByRole("tab",{name:"Past 1",exact:true}).click();
    await expect(page.getByText("Friday, October 23, 2026",{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Cancel booking",exact:true})).toHaveCount(0);
    await page.getByRole("link",{name:"View details",exact:true}).click();await expect(page.getByRole("heading",{name:"Past booking",exact:true})).toBeVisible();
    await page.getByRole("link",{name:"Back to my bookings"}).click();await expect(page.getByRole("tab",{name:"Past 1",exact:true})).toHaveAttribute("aria-selected","true");
    await page.getByRole("tab",{name:"Past 1",exact:true}).press("End");
    await expect(page.getByRole("tab",{name:"Cancelled 1",exact:true})).toHaveAttribute("aria-selected","true");
    await page.reload();await expect(page.getByRole("tab",{name:"Cancelled 1",exact:true})).toHaveAttribute("aria-selected","true");
    await page.goBack();await expect(page.getByRole("tab",{name:"Past 1",exact:true})).toHaveAttribute("aria-selected","true");
  }
  for(const tab of ["upcoming","past","cancelled"]) {
    await page.goto(`${base}?tab=${tab}&fixtureBookings=empty`);
    await expect(page.getByRole("heading",{name:tab === "upcoming" ? "No upcoming bookings" : tab === "past" ? "No past bookings yet" : "No cancelled bookings"})).toBeVisible();
  }
  await page.goto(`${base}?fixtureBookings=service`);await expect(page.getByRole("alert")).toContainText("We couldn’t load your bookings");
  await expect(page.locator(".booking-tab-count").first()).toHaveText("—");await expect(page.getByText("No upcoming bookings",{exact:true})).toHaveCount(0);
  await page.goto(`${base}?fixtureBookings=pagination`);await expect(page.getByRole("tab",{name:"Upcoming 14",exact:true})).toBeVisible();await expect(page.locator(".booking-list-card")).toHaveCount(12);
  await page.goto(`${base}?page=2&fixtureBookings=pagination`);await expect(page.locator(".booking-list-card")).toHaveCount(2);await expect(page.getByText("Page 2 of 2",{exact:true})).toBeVisible();
  await page.goto(`${base}?fixtureBookings=missing-space`);await expect(page.getByRole("heading",{name:"Space details unavailable"}).first()).toBeVisible();await expect(page.locator(".booking-list-card")).toHaveCount(2);
  for(const mode of ["service","started"]) {
    await page.goto(`${base}?fixtureCancel=${mode}`);await page.getByRole("button",{name:"Cancel booking",exact:true}).click();
    const dialog=page.getByRole("dialog");await dialog.getByRole("button",{name:"Cancel booking",exact:true}).click();
    await expect(dialog.getByRole("button",{name:"Cancelling booking…"})).toBeDisabled();
    await page.keyboard.press("Escape");await expect(dialog).toBeVisible();await expect(dialog.getByRole("button",{name:"Keep booking"})).toBeDisabled();
    await expect(dialog.getByRole("alert")).toContainText(mode === "service" ? "couldn’t cancel" : "already started");
    await expect(page.getByText("Booking cancelled",{exact:true})).toHaveCount(0);
    await dialog.getByRole("button",{name:"Keep booking"}).click();await expect(page.getByRole("tab",{name:"Upcoming 2",exact:true})).toBeVisible();
  }
  await page.goto(base);await page.getByRole("button",{name:"Cancel booking",exact:true}).click();
  await page.getByRole("dialog").getByRole("button",{name:"Cancel booking",exact:true}).click();
  await expect(page.getByRole("tab",{name:"Cancelled 2",exact:true})).toHaveAttribute("aria-selected","true");
  await expect(page.locator(".booking-success")).toContainText("Booking cancelled");await expect(page.locator(".booking-success")).toContainText(id.toUpperCase());
  await expect(page.getByRole("tab",{name:"Upcoming 1",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Cancel booking",exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole("tab",{name:"Cancelled 2",exact:true})).toBeVisible();
  await page.locator(".booking-list-card").filter({hasText:id.toUpperCase()}).getByRole("link",{name:"View details",exact:true}).click();
  await expect(page.getByRole("heading",{name:"This booking was cancelled",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Back to my bookings"}).click();await expect(page.getByRole("tab",{name:"Cancelled 2",exact:true})).toHaveAttribute("aria-selected","true");
  console.log("PASS: isolated My bookings UI — real-component counts/tabs/history, ongoing eligibility, desktop/mobile cards/dialog, focus trap/Escape/restoration, Keep without mutation, pending/errors, fixture cancellation persistence and truthful past/cancelled details. No hosted actions.");
}
