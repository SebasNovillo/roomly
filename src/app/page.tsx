import { LandingPage } from "@/components/landing/landing-page";
import { createClient } from "@/lib/supabase/server";
import "./landing.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let authenticated = false;
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    authenticated = Boolean(user && !error);
  } catch {
    // Keep the public landing available without Supabase or during an outage.
  }
  return <LandingPage authenticated={authenticated} />;
}
