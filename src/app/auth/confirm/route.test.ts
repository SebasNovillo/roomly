import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks }) }));
import { GET } from "./route";
beforeEach(() => vi.resetAllMocks());
it.each(["", "?token_hash=expired&type=email", "?token_hash=invalid&type=recovery"])("handles missing/expired/unsupported confirmation links", async (query) => {
  mocks.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: "expired" } });
  const result = await GET(new NextRequest(`http://localhost/auth/confirm${query}`));
  expect(result.headers.get("location")).toBe("http://localhost/sign-in?error=confirmation");
  expect(result.headers.get("cache-control")).toContain("no-store");
  expect(result.headers.get("referrer-policy")).toBe("no-referrer");
  if (!query || query.includes("recovery")) expect(mocks.verifyOtp).not.toHaveBeenCalled();
});
it("sets a safe, token-free destination after verification", async () => {
  mocks.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
  const result = await GET(new NextRequest("http://localhost/auth/confirm?token_hash=one-use-hash&type=email&next=https://evil.example"));
  expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "one-use-hash", type: "email" });
  expect(result.headers.get("location")).toBe("http://localhost/dashboard");
  expect(result.status).toBe(303);
});
