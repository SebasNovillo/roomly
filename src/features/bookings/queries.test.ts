import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(()=>({getViewer:vi.fn(),createClient:vi.fn(),rpc:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/features/auth/viewer",()=>({getViewer:mocks.getViewer}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
import { getBookingDay, getReservation, getMyBookings } from "./queries";
const id = "bb000000-0000-4000-8000-000000000001";
beforeEach(()=>{
  vi.resetAllMocks(); mocks.getViewer.mockResolvedValue({name:"Member"}); mocks.createClient.mockResolvedValue(mocks);
  for(const key of ["from","select","eq"] as const) mocks[key].mockReturnValue(mocks);
  mocks.maybeSingle.mockResolvedValue({data:null,error:null});
  mocks.rpc.mockResolvedValue({data:{state:"unconfigured",now:"2027-01-05T12:00:00Z"},error:null});
});
describe("booking reads with mocked Supabase; database RLS tested separately",()=>{
  it("keeps auth redirects outside service error handling",async()=>{
    mocks.getViewer.mockRejectedValue(new Error("AUTH_REDIRECT"));
    await expect(getBookingDay(id,"2027-01-05")).rejects.toThrow("AUTH_REDIRECT");
    await expect(getReservation(id)).rejects.toThrow("AUTH_REDIRECT");
    await expect(getMyBookings("upcoming",1)).rejects.toThrow("AUTH_REDIRECT");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("distinguishes setup errors from valid unconfigured hours",async()=>{
    expect(await getBookingDay(id,"2027-01-05")).toMatchObject({ok:true,day:{state:"unconfigured"}});
    mocks.rpc.mockResolvedValueOnce({data:null,error:{code:"PGRST202"}});
    expect(await getBookingDay(id,"2027-01-05")).toEqual({ok:false,kind:"setup"});
    mocks.rpc.mockRejectedValueOnce(new Error("private service data"));
    expect(await getBookingDay(id,"2027-01-05")).toEqual({ok:false,kind:"service"});
  });
  it("does not request malformed IDs or dates",async()=>{
    expect(await getReservation("not-a-uuid")).toEqual({ok:true,reservation:null});
    expect((await getBookingDay(id,"2027-02-30")).ok).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("handles owner-filtered missing confirmations and reads retries by key",async()=>{
    expect(await getReservation(id)).toEqual({ok:true,reservation:null});
    expect(mocks.eq).toHaveBeenCalledWith("id",id);
    await getReservation(id,true);
    expect(mocks.eq).toHaveBeenCalledWith("request_id",id);
    expect(mocks.select).toHaveBeenCalledWith("id,space_id,starts_at,ends_at,status");
  });
  it("does not transform read errors or malformed records into confirmations",async()=>{
    mocks.maybeSingle.mockResolvedValueOnce({data:null,error:{code:"42501"}});
    expect(await getReservation(id)).toEqual({ok:false});
    mocks.maybeSingle.mockResolvedValueOnce({data:{id},error:null});
    expect(await getReservation(id)).toEqual({ok:false});
  });
  it("loads bounded lists through owner RLS without selecting user_id or replacing setup failure with zero counts",async()=>{
    const list={now:"2026-10-26T18:00:00Z",page:2,pageSize:12,counts:{upcoming:13,past:1,cancelled:2},total:13,bookings:[]};
    mocks.rpc.mockResolvedValueOnce({data:list,error:null});
    expect(await getMyBookings("upcoming",2)).toEqual({ok:true,list});
    expect(mocks.rpc).toHaveBeenCalledWith("my_bookings",{p_tab:"upcoming",p_page:2});expect(mocks.from).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({data:null,error:{code:"PGRST202"}});expect(await getMyBookings("upcoming",1)).toEqual({ok:false,kind:"setup"});
    mocks.rpc.mockResolvedValueOnce({data:{...list,bookings:[{id}]},error:null});expect(await getMyBookings("upcoming",1)).toEqual({ok:false,kind:"service"});
  });
});
