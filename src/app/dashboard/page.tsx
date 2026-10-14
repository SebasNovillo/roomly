import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try { getSupabaseEnvironment(); } catch { redirect("/sign-in?next=%2Fdashboard"); }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/sign-in?next=%2Fdashboard");
  const { data: profile, error } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const name = profile?.full_name || (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "there");
  return <AuthShell>
    <p className="mb-3 text-sm font-semibold text-primary">YOUR ROOMLY</p>
    <h1 className="font-display text-3xl font-bold">Welcome, {name}.</h1>
    <p className="mt-4 mb-8 leading-relaxed text-muted">You’re signed in. A little space for your next big idea.</p>
    {(error || !profile) && <p role="status" className="mb-6 text-sm text-muted">Your profile is unavailable. Your account is signed in, but profile setup needs to be checked.</p>}
    <SignOutButton />
  </AuthShell>;
}
