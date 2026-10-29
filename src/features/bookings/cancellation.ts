"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/features/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import type { CancellationState } from "./my-bookings";

export async function cancelReservation(_previous: CancellationState, form: FormData): Promise<CancellationState> {
  await getViewer();
  const parsed = z.uuid().safeParse(form.get("reservationId"));
  if (!parsed.success) return {message:"This booking could not be identified. Refresh your bookings and try again."};
  try {
    const supabase = await createClient();
    const {data:{user},error:authError} = await supabase.auth.getUser();
    if (authError || !user) return {message:"Your session has expired. Sign in again to manage your bookings."};
    const {data,error} = await supabase.rpc("cancel_booking",{p_reservation_id:parsed.data});
    if (error) return {message:error.code === "22023" ? "This booking has already started and can no longer be cancelled. Keep it and refresh your bookings."
      : error.code === "P0002" ? "This booking is unavailable for your account. Refresh your bookings."
      : "We couldn’t cancel this booking right now. Try again, or keep your booking and refresh the page."};
    if (data !== parsed.data) return {message:"We couldn’t verify cancellation. Refresh your bookings before trying again."};
  } catch { return {message:"We couldn’t cancel this booking right now. Please try again."}; }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/reservations/${parsed.data}`);
  revalidatePath("/dashboard/spaces","layout");
  redirect(`/dashboard/bookings?tab=cancelled&cancelled=${parsed.data}`);
}
