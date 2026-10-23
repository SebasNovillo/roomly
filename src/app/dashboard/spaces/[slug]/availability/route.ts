import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/features/auth/viewer";
import { getSpace } from "@/features/spaces/queries";
import { getBookingDay } from "@/features/bookings/queries";
import { dateSchema } from "@/features/bookings/model";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await getViewer();
  const date = request.nextUrl.searchParams.get("date");
  const headers = { "Cache-Control": "private, no-store" };
  if (!dateSchema.safeParse(date).success) return NextResponse.json({ error: "Invalid date" },{ status:400,headers });
  const { slug } = await params;
  const result = await getSpace(slug);
  if (!result.ok || !result.space) return NextResponse.json({ error: "Space unavailable" },{ status:result.ok ? 404 : 503,headers });
  const day = await getBookingDay(result.space.id,date!);
  return day.ok ? NextResponse.json(day.day,{ headers }) : NextResponse.json({ error: "Availability unavailable" },{ status:503,headers });
}
