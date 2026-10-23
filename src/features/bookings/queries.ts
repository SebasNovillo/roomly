import "server-only";
import { z } from "zod";
import { getViewer } from "@/features/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { dateSchema, daySchema, reservationSchema, type DayResult } from "./model";

export async function getBookingDay(spaceId: string, date: string): Promise<DayResult> {
  await getViewer();
  if (!z.uuid().safeParse(spaceId).success || !dateSchema.safeParse(date).success) return { ok: false, kind: "service" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("booking_day", { p_space_id: spaceId, p_date: date });
    if (error) return { ok: false, kind: ["42883", "42P01", "PGRST202"].includes(error.code) ? "setup" : "service" };
    const parsed = daySchema.safeParse(data);
    return parsed.success ? { ok: true, day: parsed.data } : { ok: false, kind: "service" };
  } catch { return { ok: false, kind: "service" }; }
}

export async function getReservation(id: string, byRequest = false) {
  await getViewer();
  if (!z.uuid().safeParse(id).success) return { ok: true as const, reservation: null };
  try {
    const supabase = await createClient();
    // RLS enforces ownership, including guessed confirmation URLs. No user ID input.
    const { data, error } = await supabase.from("reservations").select("id,space_id,starts_at,ends_at,status").eq(byRequest ? "request_id" : "id", id).maybeSingle();
    if (error) return { ok: false as const };
    if (!data) return { ok: true as const, reservation: null };
    const parsed = reservationSchema.safeParse(data);
    return parsed.success ? { ok: true as const, reservation: parsed.data } : { ok: false as const };
  } catch { return { ok: false as const }; }
}
