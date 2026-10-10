"use client";

import "client-only";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnvironment } from "@/lib/env";

export function createClient() {
  const env = getSupabaseEnvironment();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
