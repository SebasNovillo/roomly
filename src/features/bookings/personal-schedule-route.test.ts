import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks=vi.hoisted(()=>({getViewer:vi.fn(),getPersonalConflicts:vi.fn()}));
vi.mock("@/features/auth/viewer",()=>({getViewer:mocks.getViewer}));
vi.mock("@/features/bookings/personal-schedule-query",()=>({getPersonalConflicts:mocks.getPersonalConflicts}));
import { GET } from "@/app/dashboard/schedule-conflicts/route";
const request=(query="date=2027-01-05&start=09:00&end=10:00")=>new NextRequest(`http://localhost/dashboard/schedule-conflicts?${query}`);
beforeEach(()=>{vi.resetAllMocks();mocks.getViewer.mockResolvedValue({name:"Member"});mocks.getPersonalConflicts.mockResolvedValue({conflicts:[]});});
it("returns private/no-store results and forwards only the selection",async()=>{
  const response=await GET(request("date=2027-01-05&start=09:00&end=10:00&user_id=untrusted"));
  expect(response.status).toBe(200);expect(await response.json()).toEqual({conflicts:[]});
  expect(response.headers.get("cache-control")).toBe("private, no-store");expect(response.headers.get("vary")).toBe("Cookie");
  expect(mocks.getPersonalConflicts).toHaveBeenCalledWith({date:"2027-01-05",start:"09:00",end:"10:00"});
});
it("keeps failed reads distinct from clear results, without provider details",async()=>{
  mocks.getPersonalConflicts.mockResolvedValue(null);const response=await GET(request());
  expect(response.status).toBe(503);expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({error:"Schedule could not be checked"});
});
it("rejects invalid intervals and unauthenticated reads",async()=>{
  const response=await GET(request("date=2027-01-05&start=10:00&end=09:00"));expect(response.status).toBe(400);expect(mocks.getPersonalConflicts).not.toHaveBeenCalled();
  mocks.getViewer.mockRejectedValue(new Error("AUTH_REDIRECT"));await expect(GET(request())).rejects.toThrow("AUTH_REDIRECT");
});
