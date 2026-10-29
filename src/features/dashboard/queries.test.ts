import { beforeEach,expect,it,vi } from "vitest";
import { dashboardList } from "../../../tests/fixtures/dashboard";
const mocks=vi.hoisted(()=>({getMyBookings:vi.fn(),createClient:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),in:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/features/bookings/queries",()=>({getMyBookings:mocks.getMyBookings}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
import { getDashboardBookings } from "./queries";
beforeEach(()=>{
  vi.resetAllMocks();mocks.getMyBookings.mockResolvedValue({ok:true,list:dashboardList()});
  mocks.createClient.mockResolvedValue(mocks);for(const key of ["from","select","eq"] as const) mocks[key].mockReturnValue(mocks);
  mocks.in.mockResolvedValue({data:[{id:dashboardList().bookings[0].space_id,type:"meeting-room"}],error:null});
});
it("reuses one bounded RPC snapshot and one metadata batch; totals cover more than displayed/page entries",async()=>{
  const result=await getDashboardBookings();expect(mocks.getMyBookings).toHaveBeenCalledExactlyOnceWith("upcoming",1);
  expect(mocks.from).toHaveBeenCalledExactlyOnceWith("spaces");expect(mocks.select).toHaveBeenCalledWith("id,type");
  expect(mocks.eq).toHaveBeenCalledWith("is_active",true);
  expect(mocks.in).toHaveBeenCalledWith("id",[dashboardList().bookings[0].space_id]);
  expect(result).toMatchObject({ok:true,dashboard:{now:dashboardList().now,counts:{upcoming:15,past:1,cancelled:1}}});
  if(result.ok) {expect(result.dashboard.plans).toHaveLength(3);expect(result.dashboard.featured).toBeTruthy();}
});
it("does not query hidden metadata or replace unreadable types with fabricated values",async()=>{
  mocks.getMyBookings.mockResolvedValueOnce({ok:true,list:dashboardList("missing")});
  let result=await getDashboardBookings();expect(mocks.createClient).not.toHaveBeenCalled();
  expect(result.ok && result.dashboard.featured?.space).toBeNull();
  mocks.in.mockRejectedValue(new Error("private error"));result=await getDashboardBookings();
  expect(result.ok && result.dashboard.spaceTypes).toEqual({});expect(result.ok && result.dashboard.counts.upcoming).toBe(15);
});
it("preserves auth/service failures and never turns a failed read into zero bookings",async()=>{
  mocks.getMyBookings.mockResolvedValueOnce({ok:false,kind:"service"});expect(await getDashboardBookings()).toEqual({ok:false,kind:"service"});
  expect(mocks.createClient).not.toHaveBeenCalled();
  mocks.getMyBookings.mockRejectedValueOnce(new Error("AUTH_REDIRECT"));await expect(getDashboardBookings()).rejects.toThrow("AUTH_REDIRECT");
});
it("handles no/one bookings and never reuses a prior caller's snapshot",async()=>{
  await getDashboardBookings();mocks.getMyBookings.mockResolvedValueOnce({ok:true,list:dashboardList("empty")});
  expect(await getDashboardBookings()).toMatchObject({ok:true,dashboard:{featured:null,plans:[],counts:{upcoming:0,past:0,cancelled:0}}});
  mocks.getMyBookings.mockResolvedValueOnce({ok:true,list:dashboardList("one")});
  const result=await getDashboardBookings();expect(result.ok && result.dashboard.plans).toEqual([]);
});
it("fails clearly if counts and returned upcoming entries are inconsistent",async()=>{
  mocks.getMyBookings.mockResolvedValueOnce({ok:true,list:{...dashboardList(),bookings:[]}});
  expect(await getDashboardBookings()).toEqual({ok:false,kind:"service"});
});
