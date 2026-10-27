import type { CancellationState } from "../../../src/features/bookings/my-bookings";
// Test transport only; this module cannot contact the application or Supabase.
export async function cancelReservation(_state:CancellationState,form:FormData):Promise<CancellationState> {
  await new Promise(resolve=>setTimeout(resolve,500));
  const mode=new URLSearchParams(location.search).get("fixtureCancel");
  if(mode === "service") return {message:"We couldn’t cancel this booking right now. Try again, or keep your booking and refresh the page."};
  if(mode === "started") return {message:"This booking has already started and can no longer be cancelled. Keep it and refresh your bookings."};
  const id=String(form.get("reservationId"));
  const response=await fetch("/__fixtures/cancellation",{method:"POST",body:id});
  if(!response.ok) return {message:"Fixture cancellation failed."};
  // Simulates the successful server-action redirect in the isolated Vite UI.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/dashboard/bookings?tab=cancelled&cancelled=${encodeURIComponent(id)}`);
  return {};
}
