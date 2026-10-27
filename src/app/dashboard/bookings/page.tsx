import { getViewer } from "@/features/auth/viewer";
import { getMyBookings, getReservation } from "@/features/bookings/queries";
import { parseBookingPage } from "@/features/bookings/my-bookings";
import { BookingsView } from "@/features/bookings/components/bookings-view";
import type { SearchParams } from "@/features/spaces/catalog";

export default async function BookingsPage({ searchParams }: {searchParams:Promise<SearchParams>}) {
  await getViewer();
  const params = await searchParams;
  const {tab,page} = parseBookingPage(params);
  const result = await getMyBookings(tab,page);
  let successReference: string | undefined;
  if (typeof params.cancelled === "string") {
    const cancelled = await getReservation(params.cancelled);
    // A query parameter alone is not proof that a cancellation succeeded.
    if (cancelled.ok && cancelled.reservation?.status === "cancelled") successReference = cancelled.reservation.id;
  }
  return <BookingsView result={result} tab={tab} successReference={successReference} />;
}
