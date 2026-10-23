import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/features/auth/viewer";
import { parseFilters, type SearchParams } from "@/features/spaces/catalog";
import { getSpace } from "@/features/spaces/queries";
import { bookingHref, parseSelection, selectionIssue, serviceMessage, wallInstant } from "@/features/bookings/model";
import { getBookingDay, getReservation } from "@/features/bookings/queries";
import { ReviewView } from "@/features/bookings/components/review-view";

export default async function BookingReviewPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  await getViewer();
  const { slug } = await params;
  const query = await searchParams;
  const filters = parseFilters(query), selection = parseSelection(query);
  const result = await getSpace(slug);
  if (!result.ok) return <div className="dashboard-card catalog-state"><h1>Booking review unavailable</h1><p>{serviceMessage}</p><Link className="text-link" href={bookingHref(slug,filters,selection)}>Change date or time</Link></div>;
  if (!result.space) notFound();
  const requestId = typeof query.request === "string" && z.uuid().safeParse(query.request).success ? query.request : null;
  if (!requestId) redirect(bookingHref(slug,filters,selection,true,randomUUID()));
  // Recover a committed booking after a lost response or a review-page reload.
  const attempt = await getReservation(requestId,true);
  if (attempt.ok && attempt.reservation?.status === "confirmed" && attempt.reservation.space_id === result.space.id
    && Date.parse(attempt.reservation.starts_at) === wallInstant(selection.date,selection.start)
    && Date.parse(attempt.reservation.ends_at) === wallInstant(selection.date,selection.end)) {
    redirect(`/dashboard/reservations/${attempt.reservation.id}`);
  }
  const day = await getBookingDay(result.space.id,selection.date);
  const issue = selectionIssue(selection,day,day.ok ? Date.parse(day.day.now) : 0);
  return <ReviewView space={result.space} selection={selection} requestId={requestId} changeHref={bookingHref(slug,filters,selection)} issue={issue} />;
}
