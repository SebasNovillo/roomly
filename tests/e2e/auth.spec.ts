import { expect, test } from "@playwright/test";

test("account links and unauthenticated dashboard protection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  for (const destination of ["/dashboard/spaces", "/dashboard/spaces/atlas-meeting-room?q=Atlas", "/dashboard/spaces/atlas-meeting-room/review?date=2027-01-05&start=09:00&end=10:00", "/dashboard/spaces/atlas-meeting-room/availability?date=2027-01-05", "/dashboard/reservations/bb000000-0000-4000-8000-000000000001", "/dashboard/bookings", "/dashboard/schedule-conflicts?date=2027-01-05&start=09:00&end=10:00"]) {
    await page.goto(destination);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  }
});

test("sign in validates on the server and password visibility is accessible", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
});

test("registration validation prevents an Auth request and handles bad confirmation links", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name", { exact: true }).fill("A");
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password", { exact: true }).fill("different");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Enter your full name (at least 2 characters).")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/auth/confirm");
  await expect(page).toHaveURL(/\/sign-in\?error=confirmation/);
  await expect(page.getByRole("alert").filter({ hasText: "This confirmation link" })).toContainText("invalid or has expired");
});
