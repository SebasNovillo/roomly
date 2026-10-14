import { describe, expect, it } from "vitest";
import { safeDestination, signInSchema, signUpSchema } from "./validation";

describe("auth validation", () => {
  it("requires a valid email and password for sign in", () => {
    const result = signInSchema.safeParse({ email: "wrong", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.error.flatten().fieldErrors)).toEqual(["email", "password"]);
  });
  it("trims names/emails but preserves password whitespace", () => {
    expect(signUpSchema.parse({ fullName: "  A Person  ", email: " person@example.com ", password: " secret pass ", confirmPassword: " secret pass " }))
      .toMatchObject({ fullName: "A Person", email: "person@example.com", password: " secret pass " });
  });
  it.each([
    { fullName: " ", password: "long-password", confirmPassword: "long-password" },
    { fullName: "Person", password: "short", confirmPassword: "short" },
    { fullName: "Person", password: "long-password", confirmPassword: "different" },
  ])("rejects incomplete or mismatched registration fields", (fields) => {
    expect(signUpSchema.safeParse({ email: "person@example.com", ...fields }).success).toBe(false);
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/%2f%2fevil.example", "/dashboard/../auth/confirm", "/dashboard?token=secret", "/sign-in", null, ["/"]])("rejects unsafe/unimplemented destinations", (value) => {
    expect(safeDestination(value)).toBe("/dashboard");
  });
  it("accepts only implemented internal destinations", () => {
    expect(safeDestination("/")).toBe("/");
    expect(safeDestination("/dashboard")).toBe("/dashboard");
  });
});
