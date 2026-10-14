import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ createServerClient: vi.fn() }));
vi.mock("@supabase/ssr", () => mocks);
vi.mock("@/lib/env", () => ({ getSupabaseEnvironment: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "unused" }) }));
import { updateSession } from "./proxy";
it("verifies claims and carries refreshed cookies to both request and response, retaining cache headers", async () => {
  const request = new NextRequest("http://localhost/dashboard");
  const getClaims = vi.fn();
  mocks.createServerClient.mockImplementation((_url, _key, options) => {
    getClaims.mockImplementation(async () => {
      options.cookies.setAll([{ name: "auth.0", value: "refreshed", options: { httpOnly: true } }], { "Cache-Control": "private, no-store" });
      options.cookies.setAll([{ name: "auth.1", value: "chunk", options: {} }], {});
    });
    return { auth: { getClaims } };
  });
  const response = await updateSession(request);
  expect(getClaims).toHaveBeenCalledOnce();
  expect(request.cookies.get("auth.0")?.value).toBe("refreshed");
  expect(response.cookies.get("auth.0")?.value).toBe("refreshed");
  expect(response.cookies.get("auth.1")?.value).toBe("chunk");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
});
