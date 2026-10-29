"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/features/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { selectionSchema, serviceMessage, userScheduleConflictMessage, type BookingState } from "./model";

export async function confirmBooking(_previous: BookingState, form: FormData): Promise<BookingState> {
  await getViewer();
  const parsed = selectionSchema.extend({ spaceId: z.uuid(), requestId: z.uuid() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Check your date and time selection, then try again." };
  let id: string;
  try {
    const supabase = await createClient();
    // Verify the session independently in this mutation; the RPC also checks auth.uid().
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { message: "Your session has expired. Sign in again to confirm." };
    const { date, start, end, spaceId, requestId } = parsed.data;
    const { data, error } = await supabase.rpc("create_booking", { p_space_id: spaceId, p_date: date, p_start: start, p_end: end, p_request_id: requestId });
    if (error?.code === "PBR01") return { message: userScheduleConflictMessage, conflict: "user-schedule" };
    if (error) return { message: error.code === "23P01" ? "This time was just taken or blocked. Change your date or time and try again."
      : error.code === "22023" ? "This selection no longer meets the booking rules. Change your date or time and try again." : serviceMessage };
    if (!z.uuid().safeParse(data).success) return { message: serviceMessage };
    id = data;
  } catch { return { message: serviceMessage }; }
  // Only a successful, validated database result can reach this redirect.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/spaces","layout");
  redirect(`/dashboard/reservations/${id}`);
}
