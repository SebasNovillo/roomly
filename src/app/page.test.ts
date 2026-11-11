import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
import HomePage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
});

it.each([
  { user: null, error: null, authenticated: false },
  { user: { id: "verified-member" }, error: null, authenticated: true },
  { user: { id: "unverified" }, error: new Error("invalid token"), authenticated: false },
])("renders account actions for verified authentication: $authenticated", async ({ user, error, authenticated }) => {
  mocks.getUser.mockResolvedValue({ data: { user }, error });
  const result = await HomePage();
  expect(result.props.authenticated).toBe(authenticated);
  const html = renderToStaticMarkup(createElement(result.type, result.props));
  const hrefs = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]);
  expect(hrefs).toEqual(authenticated
    ? ["#main", "/dashboard", "/dashboard", "/dashboard", "/dashboard", "/dashboard"]
    : ["#main", "/", "/sign-in", "/sign-up", "/sign-up", "/sign-in", "/sign-up", "/"]);
  expect(html.includes("Go to dashboard")).toBe(authenticated);
  expect(html.includes('href="/sign-in"')).toBe(!authenticated);
});

it.each(["configuration", "network"])("keeps the public page available on a %s failure", async (failure) => {
  if (failure === "configuration") mocks.createClient.mockRejectedValue(new Error("not configured"));
  else mocks.getUser.mockRejectedValue(new Error("network unavailable"));
  expect((await HomePage()).props.authenticated).toBe(false);
});
