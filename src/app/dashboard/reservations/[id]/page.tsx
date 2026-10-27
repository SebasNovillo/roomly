import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/features/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { getSpace } from "@/features/spaces/queries";
import { getReservation, getBookingTime } from "@/features/bookings/queries";
import { serviceMessage } from "@/features/bookings/model";
import { ConfirmationView } from "@/features/bookings/components/confirmation-view";

export default async function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  await getViewer();
  const { id } = await params;
  const result = await getReservation(id);
  if (!result.ok) return <div className="dashboard-card catalog-state"><h1>We couldn’t load this booking</h1><p>{serviceMessage}</p><Link href={`/dashboard/reservations/${encodeURIComponent(id)}`} className="text-link">Try again</Link></div>;
  if (!result.reservation) notFound();
  const reservation = result.reservation;
  const supabase = await createClient();
  const { data: spaceRow } = await supabase.from("spaces").select("slug").eq("id",reservation.space_id).maybeSingle();
  const spaceResult = typeof spaceRow?.slug === "string" ? await getSpace(spaceRow.slug) : null;
  return <ConfirmationView reservation={reservation} space={spaceResult?.ok ? spaceResult.space : null} now={getBookingTime()} />;
}
