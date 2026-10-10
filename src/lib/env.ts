import { z } from "zod";

const supabaseEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine(
    (value) => /^https?:\/\//.test(value) && !value.includes("your-project"),
    "Use your Supabase project HTTP(S) URL",
  ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().startsWith("sb_publishable_").refine(
    (value) => value.length > "sb_publishable_".length && !value.includes("replace_with"),
    "Use your Supabase publishable key",
  ),
});

export type SupabaseEnvironment = z.infer<typeof supabaseEnvironmentSchema>;

// Validate only when a Supabase feature is invoked, never at module import/build time.
export function getSupabaseEnvironment(): SupabaseEnvironment {
  const result = supabaseEnvironmentSchema.safeParse({
    // Explicit references are required for Next.js to inline public values in the browser.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path[0]))];
    throw new Error(
      `Supabase configuration is missing or invalid: ${fields.join(", ")}. ` +
      "Set these values in .env.local using .env.example, then restart the development server " +
      "(or rebuild for production). Use a publishable key. The Roomly home page does not require Supabase.",
    );
  }

  return result.data;
}
