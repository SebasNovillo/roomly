import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks, from: mocks.from }) }));
vi.mock("@/lib/env", () => ({ getSupabaseEnvironment: () => ({}) }));
vi.mock("@/components/auth-shell", () => ({ AuthShell: () => null }));
vi.mock("@/components/sign-out-button", () => ({ SignOutButton: () => null }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
import DashboardPage from "./page";
it("redirects unauthenticated users before reading profiles or rendering protected content", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  await expect(DashboardPage()).rejects.toThrow("REDIRECT:/sign-in?next=%2Fdashboard");
  expect(mocks.from).not.toHaveBeenCalled();
});
