import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnvironment } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("Supabase environment validation", () => {
  it("fails only on invocation and tells the caller how to configure missing values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    expect(getSupabaseEnvironment).toThrow(/NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(getSupabaseEnvironment).toThrow(/\.env\.local/);
  });

  it("accepts an HTTP(S) project URL and a publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test_value");
    expect(getSupabaseEnvironment()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unit_test_value",
    });
  });

  it.each(["", "sb_secret_never_expose", "sb_publishable_replace_with_your_key"])(
    "rejects empty, secret, and placeholder keys without including their values in errors",
    (key) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
      expect(getSupabaseEnvironment).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
      if (key) expect(getSupabaseEnvironment).not.toThrow(new RegExp(key));
    },
  );

  it.each(["not-a-url", "ftp://example.com", "https://your-project.supabase.co"])(
    "rejects malformed, non-HTTP, and placeholder URLs",
    (url) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test_value");
      expect(getSupabaseEnvironment).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    },
  );
});
