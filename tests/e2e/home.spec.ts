import { expect, test } from "@playwright/test";

test("approved landing, account destinations, and safe keyboard preview", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Roomly/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A little space for your next big idea.");
  await expect(page.getByRole("link", { name: "Get started", exact: true })).toHaveCount(3);
  for (const link of await page.getByRole("link", { name: "Get started", exact: true }).all()) await expect(link).toHaveAttribute("href", "/sign-up");
  for (const link of await page.getByRole("link", { name: "Sign in", exact: true }).all()) await expect(link).toHaveAttribute("href", "/sign-in");
  await expect(page.locator("header nav a")).toHaveCount(2);
  await expect(page.locator("footer a")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Cancel booking/ })).toHaveCount(0);
  await expect(page.locator("main form")).toHaveCount(0);
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowDown");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Room availability");
  await page.keyboard.press("End");
  await expect(tabs.nth(2)).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Alex Morgan");
  await page.keyboard.press("Home");
  await expect(tabs.nth(0)).toBeFocused();
  await tabs.nth(2).click();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await page.waitForTimeout(1200);
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).click();
  await expect(page.getByRole("tabpanel")).toContainText("Find your next space");
  expect(writes).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  for (const width of [320, 390, 768, 1024, 1440, 1574]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of await tabs.all()) {
      await tab.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px on ${await tab.textContent()}`).toBe(true);
    }
  }
  await tabs.nth(0).click();
  for (const width of [390, 1574]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async () => {
      for (const img of document.images) { img.loading = "eager"; }
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    });
    expect(await page.locator("main img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: `test-results/landing-${width}.png`, fullPage: true });
    for (const index of [1, 2]) {
      await tabs.nth(index).click();
      await page.getByRole("tabpanel").screenshot({ path: `test-results/landing-step-${index + 1}-${width}.png` });
    }
    await tabs.nth(0).click();
  }
  await page.getByRole("link", { name: "Get started", exact: true }).first().click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  expect(errors).toEqual([]);
});
