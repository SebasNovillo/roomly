import { userScheduleConflictMessage, type BookingState } from "../../../src/features/bookings/model";

// Explicitly isolated browser fixture. Never imported by production application.
export async function confirmBooking(_state: BookingState, form: FormData): Promise<BookingState> {
  await new Promise(resolve => setTimeout(resolve,300));
  const state = new URLSearchParams(location.search).get("fixtureConfirm");
  if (state === "user-schedule") return {message:userScheduleConflictMessage,conflict:"user-schedule"};
  if (state === "conflict") return { message:"This time was just taken or blocked. Change your date or time and try again." };
  if (state === "service") return { message:"Booking is temporarily unavailable. Please try again later." };
  if (!form.get("requestId")) throw new Error("Missing fixture idempotency key");
  // This fixture runs under Vite with no Next router or server action transport.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/dashboard/reservations/bb000000-0000-4000-8000-000000000001");
  return {};
}
