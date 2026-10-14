"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvironment } from "@/lib/env";
import { safeDestination, signInSchema, signUpSchema, type AuthState } from "./validation";

const unavailable = "Authentication is unavailable right now. Please try again later.";

export async function signIn(_previous: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { message: error.code === "email_not_confirmed"
      ? "Confirm your email before signing in. Open the confirmation link in your inbox."
      : "Unable to sign in. Check your email and password, then try again." };
  } catch {
    return { message: unavailable };
  }
  redirect(safeDestination(form.get("next")));
}

export async function signUp(_previous: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const { fullName, email, password } = parsed.data;
  try {
    const supabase = await createClient();
    // The confirmation template uses SiteURL (configured in Supabase), never an untrusted Host header.
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    });
    if (error) return { message: "Unable to create your account. Please try again, or sign in if you already have an account." };
    if (!data.session) return { checkEmail: true };
  } catch {
    return { message: unavailable };
  }
  redirect("/dashboard");
}

export async function signOut(): Promise<AuthState> {
  try {
    const supabase = await createClient();
    // A protected action verifies identity independently of the page/proxy.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) return { message: "Unable to sign out. Please try again." };
    }
    // Also clear stale/invalid local sessions, including chunked SSR cookies.
    const env = getSupabaseEnvironment();
    const prefix = `sb-${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
    const store = await cookies();
    store.getAll().filter(({ name }) => name === prefix || name.startsWith(`${prefix}.`) || name === `${prefix}-code-verifier`)
      .forEach(({ name }) => store.set(name, "", { path: "/", maxAge: 0 }));
  } catch {
    return { message: "Unable to sign out. Please try again." };
  }
  redirect("/sign-in");
}
