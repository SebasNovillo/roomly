import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/features/auth/viewer";
import { getPersonalConflicts } from "@/features/bookings/personal-schedule-query";
import { selectionInterval } from "@/features/bookings/personal-schedule";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  await getViewer();
  const params = request.nextUrl.searchParams;
  const selection = {date:params.get("date") ?? "",start:params.get("start") ?? "",end:params.get("end") ?? ""};
  const headers = {"Cache-Control":"private, no-store",Vary:"Cookie"};
  if (!selectionInterval(selection)) return NextResponse.json({error:"Invalid selection"},{status:400,headers});
  const result = await getPersonalConflicts(selection);
  return result ? NextResponse.json(result,{headers}) : NextResponse.json({error:"Schedule could not be checked"},{status:503,headers});
}
