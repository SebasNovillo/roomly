import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), getUser: vi.fn(), setCookie: vi.fn(),
  createClient: vi.fn(), redirect: vi.fn((url: string): never => { throw new Error(`REDIRECT:${url}`); }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  getAll: () => [{ name: "sb-project-auth-token.0" }, { name: "unrelated" }], set: mocks.setCookie,
}) }));
vi.mock("@/lib/env", () => ({ getSupabaseEnvironment: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" }) }));
import { signIn, signUp, signOut } from "./actions";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation((url: string): never => { throw new Error(`REDIRECT:${url}`); });
  mocks.createClient.mockResolvedValue({ auth: mocks });
});
describe("server auth actions (mocked Supabase; no accounts or emails)", () => {
  it("validates before creating a client and never returns passwords", async () => {
    const result = await signUp({}, form({ email: "bad", password: "short" }));
    expect(result.errors).toHaveProperty("email");
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("short");
  });
  it("shows check-email when signup returns no session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await signUp({}, form({ fullName: "A Person", email: "person@example.com", password: "valid-password", confirmPassword: "valid-password" })))
      .toEqual({ checkEmail: true });
    expect(mocks.signUp).toHaveBeenCalledWith({ email: "person@example.com", password: "valid-password", options: { data: { full_name: "A Person" } } });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("handles a returned registration session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: {} }, error: null });
    await expect(signUp({}, form({ fullName: "A Person", email: "person@example.com", password: "valid-password", confirmPassword: "valid-password" }))).rejects.toThrow("REDIRECT:/dashboard");
  });
  it("uses a safe destination after successful sign in", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    await expect(signIn({}, form({ email: "person@example.com", password: "valid-password", next: "//evil.example" }))).rejects.toThrow("REDIRECT:/dashboard");
  });
  it("handles unconfirmed email and suppresses raw provider errors", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed", message: "sensitive provider payload" } });
    const result = await signIn({}, form({ email: "person@example.com", password: "valid-password" }));
    expect(result.message).toMatch(/Confirm your email/);
    expect(JSON.stringify(result)).not.toContain("sensitive");
  });
  it("fails gracefully when auth is unavailable", async () => {
    mocks.createClient.mockRejectedValue(new Error("private details"));
    expect(await signIn({}, form({ email: "person@example.com", password: "valid-password" }))).toEqual({ message: expect.stringContaining("unavailable") });
  });
  it("verifies identity, signs out locally and clears only auth cookies", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-id" } } });
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("REDIRECT:/sign-in");
    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.setCookie).toHaveBeenCalledExactlyOnceWith("sb-project-auth-token.0", "", { path: "/", maxAge: 0 });
  });
});
