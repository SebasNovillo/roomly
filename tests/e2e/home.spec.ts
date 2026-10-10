import { expect, test } from "@playwright/test";

test("Roomly home works without Supabase and its introduction link is usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Roomly/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A little space for your next big idea.");
  await expect(page.getByText("Space discovery and booking are coming soon.")).toBeVisible();
  await page.getByRole("link", { name: "Get to know Roomly" }).click();
  await expect(page).toHaveURL(/#about-roomly$/);
  await expect(page.getByRole("heading", { name: "Good things start with the right space." })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
