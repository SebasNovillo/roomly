import { expect } from "@playwright/test";

export async function verifyAmenitiesSummary(page, base) {
  for (const width of [1574, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const appliedUrl = `${base}?minCapacity=8&amenity=display`;
    await page.goto(appliedUrl);
    const summary = page.locator(".amenities-select summary");
    const label = page.locator("#amenities-selection");
    const whiteboard = page.getByLabel("Whiteboard", { exact: true });
    const display = page.getByLabel("Display", { exact: true });
    await expect(label).toHaveText("1 selected");
    await expect(page.getByText("4 spaces found", { exact: true })).toBeVisible();
    await summary.click();
    await whiteboard.check();
    await expect(label).toHaveText("2 selected");
    await display.uncheck();
    await expect(label).toHaveText("1 selected");
    await whiteboard.uncheck();
    await expect(label).toHaveText("Any amenities");
    await display.check();
    await whiteboard.check();
    await expect(label).toHaveText("2 selected");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator(".amenities-select")).not.toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
    await expect(display).toBeChecked();
    await expect(whiteboard).toBeChecked();
    await expect(label).toHaveText("2 selected");
    // All changes above are drafts: only Apply filters may affect these.
    await expect(page).toHaveURL(appliedUrl);
    await expect(page.getByText("4 spaces found", { exact: true })).toBeVisible();
    await summary.click();
    await page.keyboard.press("Escape");
    await expect(summary).toBeFocused();
    await expect(label).toHaveText("2 selected");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    await expect(page.getByText("2 spaces found", { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.getAll("amenity").sort()).toEqual(["display", "whiteboard"]);
    await page.reload();
    await expect(label).toHaveText("2 selected");
    await expect(whiteboard).toBeChecked();
    await expect(display).toBeChecked();
    await page.goBack();
    await expect(page).toHaveURL(appliedUrl);
    await expect(label).toHaveText("1 selected");
    await expect(display).toBeChecked();
    await expect(whiteboard).not.toBeChecked();
    await page.goForward();
    await expect(label).toHaveText("2 selected");
    await expect(display).toBeChecked();
    await expect(whiteboard).toBeChecked();
    await page.getByRole("link", { name: "Clear filters", exact: true }).click();
    await expect(label).toHaveText("Any amenities");
    await expect(display).not.toBeChecked();
    await expect(whiteboard).not.toBeChecked();
    await page.goto(`${base}?amenity=wi-fi`);
    await expect(label).toHaveText("1 selected");
    await expect(page.getByLabel("Wi-Fi", { exact: true })).toBeChecked();
    await expect(display).not.toBeChecked();
    await expect(whiteboard).not.toBeChecked();
  }
  await page.setViewportSize({ width: 1574, height: 1000 });
  await page.goto(base);
}
