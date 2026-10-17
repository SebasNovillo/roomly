import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvironment } from "@/lib/env";

// Deduplicate layout/page reads within a request, never across users.
export const getViewer = cache(async () => {
  try { getSupabaseEnvironment(); } catch { redirect("/sign-in?next=%2Fdashboard"); }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/sign-in?next=%2Fdashboard");
  const { data: profile, error } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const name = profile?.full_name || (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "Member");
  return { name: name as string, profileUnavailable: Boolean(error || !profile) };
});
