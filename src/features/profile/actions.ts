"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/features/auth/viewer";
import { createClient } from "@/lib/supabase/server";

type ProfileState = { error?: string; saved?: boolean };

export async function updateProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const { id } = await getViewer();
  const name = String(form.get("fullName") ?? "").trim();
  const timezone = String(form.get("timezone") ?? "").trim();
  if (!name || Array.from(name).length > 100) return { error: "Enter a name between 1 and 100 characters." };
  if (!timezone || timezone.length > 100) return { error: "Enter a valid time zone." };
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return { error: "Enter a time zone such as America/Chicago." };
  }

  try {
    const client = await createClient();
    const { data, error } = await client.from("profiles")
      .update({ full_name: name, timezone })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "Your profile could not be saved. Try again." };
  } catch {
    return { error: "Your profile could not be saved. Try again." };
  }
  revalidatePath("/dashboard", "layout");
  return { saved: true };
}
