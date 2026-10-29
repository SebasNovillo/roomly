// Uses the Vite already installed by Vitest. This is NOT an application auth bypass.
// It renders actual UI components with isolated fixtures/adapters, no Supabase client.
import { build } from "vite";
import { chromium, expect } from "@playwright/test";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { verifyAmenitiesSummary } from "./amenities-regression.mjs";
import { verifySpaceDetail } from "./detail-regression.mjs";
import { verifyBookingFlow } from "./booking-regression.mjs";
import { verifyPersonalSchedule } from "./personal-schedule-regression.mjs";
import { verifyMyBookings } from "./my-bookings-regression.mjs";

const root = process.cwd();
const fixture = path.join(root, "tests/catalog-ui");
const dist = path.join(root, ".tools/catalog-ui-dist");
await build({ configFile: false, root: fixture, resolve: { alias: [
  { find: /^next\/link(?:\.js)?$/, replacement: path.join(fixture, "adapters/link.tsx") },
  { find: /^next\/navigation(?:\.js)?$/, replacement: path.join(fixture, "adapters/navigation.ts") },
  { find: /^next\/image(?:\.js)?$/, replacement: path.join(fixture, "adapters/image.tsx") },
  { find: "@/features/auth/actions", replacement: path.join(fixture, "adapters/actions.ts") },
  { find: "@/features/bookings/actions", replacement: path.join(fixture, "adapters/bookings.ts") },
  { find: /^\.\.\/cancellation$/, replacement: path.join(fixture, "adapters/cancellation.ts") },
  { find: /^\.\.\/actions$/, replacement: path.join(fixture, "adapters/bookings.ts") },
  { find: "@", replacement: path.join(root, "src") },
] }, build: { target:"esnext",outDir: dist, emptyOutDir: true }, oxc: { jsx: { runtime: "automatic" } }, logLevel: "error" });
const cssRoot = path.join(root, ".next/static/css");
const cssFiles = (await readdir(cssRoot)).filter(file => file.endsWith(".css"));
await writeFile(path.join(dist, "styles.css"), (await Promise.all(cssFiles.map(file => readFile(path.join(cssRoot, file), "utf8")))).join("\n"));
const cancelledFixtureIds=new Set();
const server = createServer(async (req, res) => {
  const requestPath = new URL(req.url, "http://localhost").pathname;
  if(requestPath === "/__fixtures/cancellation") {
    if(req.method === "DELETE") cancelledFixtureIds.clear();
    if(req.method === "POST") {
      let id="";for await(const chunk of req) id+=chunk;
      if(id !== "bd000000-0000-4000-8000-000000000001") {res.statusCode=400;res.end();return;}
      cancelledFixtureIds.add(id);
    }
    res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify([...cancelledFixtureIds]));return;
  }
  let file = path.join(dist, "index.html");
  if (/^\/images\/spaces\/[a-z0-9-]+\.jpg$/.test(requestPath)) file = path.join(root, "public", requestPath);
  else if (requestPath === "/styles.css" || /^\/assets\/[a-zA-Z0-9_.-]+$/.test(requestPath)) file = path.join(dist, requestPath);
  try { res.setHeader("Content-Type", file.endsWith(".js") ? "application/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".jpg") ? "image/jpeg" : "text/html"); res.end(await readFile(file)); }
  catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(3131, "127.0.0.1", resolve));
const browser = await chromium.launch({ headless: true });
const output = path.join(root, "test-results/catalog-ui");
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1574, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  const base = "http://127.0.0.1:3131/dashboard/spaces";
  await verifyAmenitiesSummary(page, base);
  await page.goto(base);
  await expect(page.getByText("6 spaces found")).toBeVisible();
  await expect(page.locator(".space-card-photo img")).toHaveCount(6);
  await expect.poll(() => page.locator(".space-card-photo img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  const photoBox = await page.locator(".space-card-photo").first().boundingBox();
  expect(Math.abs(photoBox.width / photoBox.height - 2)).toBeLessThan(0.02);
  await page.screenshot({ path: path.join(output, "desktop.png"), fullPage: true });
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    if (width === 390) {
      await page.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });
      await page.screenshot({ path: path.join(output, "mobile-viewport.png") });
    }
  }
  await page.getByLabel("Search", { exact: true }).fill("Atlas");
  await page.getByLabel("Minimum capacity").selectOption("8");
  await page.getByLabel("Space type", { exact: true }).selectOption("meeting-room");
  await page.locator(".amenities-select summary").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".amenities-select")).not.toHaveAttribute("open", "");
  await page.locator(".amenities-select summary").click();
  await page.getByLabel("Wi-Fi", { exact: true }).check();
  await page.getByLabel("Display", { exact: true }).check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("1 space found", { exact: true })).toBeVisible();
  const filteredUrl = page.url();
  const query = new URL(filteredUrl).searchParams;
  expect(query.get("q")).toBe("Atlas");
  expect(query.get("minCapacity")).toBe("8");
  expect(query.get("type")).toBe("meeting-room");
  expect(query.getAll("amenity")).toEqual(["wi-fi", "display"]);
  await page.reload();
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("Atlas");
  await page.getByRole("link", { name: "View space: Atlas Meeting Room" }).click();
  await expect(page.getByRole("heading", { name: "Atlas Meeting Room", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1574, height: 1000 });
  await page.screenshot({ path: path.join(output, "detail.png"), fullPage: true });
  await expect(page.locator(".desktop-sidebar .sidebar-link[aria-current='page']")).toHaveText("Explore spaces");
  await expect(page.getByRole("link", { name: "Back to spaces" })).toHaveAttribute("href", /q=Atlas.*minCapacity=8.*type=meeting-room.*amenity=display.*amenity=wi-fi/);
  await page.getByRole("link", { name: "Back to spaces" }).click();
  await expect(page.getByText("1 space found", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page.getByText("6 spaces found")).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("Atlas");
  await expect(page.getByText("1 space found", { exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByText("6 spaces found")).toBeVisible();
  await page.getByLabel("Search", { exact: true }).fill("not a real room");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("heading", { name: "No spaces match your filters" })).toBeVisible();
  await page.goto(`${base}?fixtureState=empty`);
  await expect(page.getByRole("heading", { name: "The catalog is empty" })).toBeVisible();
  await page.goto(`${base}?fixtureState=setup`);
  await expect(page.getByRole("heading", { name: "Catalog setup needed" })).toBeVisible();
  await expect(page.getByText("0 spaces found")).toHaveCount(0);
  await page.goto(`${base}?fixtureState=load`);
  await expect(page.getByRole("heading", { name: "We couldn’t load the spaces" })).toBeVisible();
  await page.goto(`${base}/missing-room`);
  await expect(page.getByRole("heading", { name: "Space not found" })).toBeVisible();
  await verifySpaceDetail(page, base, output);
  await verifyBookingFlow(page, base, output);
  await verifyPersonalSchedule(page, base, output);
  await verifyMyBookings(page,"http://127.0.0.1:3131/dashboard/bookings",output);
  await page.route("**/images/spaces/atlas-meeting-room.jpg", route => route.abort());
  await page.goto(base);
  await expect(page.locator(".space-card").first().getByText("Photo unavailable")).toBeVisible();
  expect(errors).toEqual([]);
  console.log("PASS: isolated catalog UI — original photos, desktop/320/390/768 layouts, combined URL filters, refresh/back/forward, detail/back links, active sidebar, error/empty/no-results/missing/broken-photo states. No live Supabase verification.");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
