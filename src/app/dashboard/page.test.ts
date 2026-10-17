import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks, from: mocks.from }) }));
vi.mock("@/lib/env", () => ({ getSupabaseEnvironment: () => ({}) }));
vi.mock("@/components/auth-shell", () => ({ AuthShell: () => null }));
vi.mock("@/components/sign-out-button", () => ({ SignOutButton: () => null }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
import DashboardPage from "./page";
import DashboardLayout from "./layout";
import SpacesPage from "./spaces/page";
import BookingsPage from "./bookings/page";
beforeEach(() => vi.clearAllMocks());
it.each([DashboardPage, SpacesPage, BookingsPage, () => DashboardLayout({ children: null })])("redirects unauthenticated users before reading profiles or rendering protected content (%#)", async (render) => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  await expect(render()).rejects.toThrow("REDIRECT:/sign-in?next=%2Fdashboard");
  expect(mocks.from).not.toHaveBeenCalled();
});

it("uses the verified user's own profile name rather than metadata", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user", user_metadata: { full_name: "Old display name" } } }, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: { full_name: "Current profile name" }, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  mocks.from.mockReturnValue({ select });
  const result = await DashboardPage();
  expect(result.props.name).toBe("Current profile name");
  expect(mocks.from).toHaveBeenCalledWith("profiles");
  expect(select).toHaveBeenCalledWith("full_name");
  expect(eq).toHaveBeenCalledWith("id", "verified-user");
});

it("keeps profile failure separate from a verified sign-in", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user", user_metadata: { full_name: "Display name" } } }, error: null });
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: "unavailable" } }) }) }) });
  const result = await DashboardLayout({ children: null });
  expect(result.props.name).toBe("Display name");
  expect(result.props.children[0].props.role).toBe("status");
});
