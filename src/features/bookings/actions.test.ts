import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(()=>({ getViewer:vi.fn(),createClient:vi.fn(),getUser:vi.fn(),rpc:vi.fn(),redirect:vi.fn() }));
vi.mock("@/features/auth/viewer",()=>({getViewer:mocks.getViewer}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("next/navigation",()=>({redirect:mocks.redirect}));
import { confirmBooking } from "./actions";
import { userScheduleConflictMessage } from "./model";
const id = "bb000000-0000-4000-8000-000000000001";
const form = () => { const value = new FormData(); for (const [key,entry] of Object.entries({spaceId:id,requestId:id,date:"2027-01-05",start:"09:00",end:"10:00",userId:"attacker-supplied-identity"})) value.set(key,entry); return value; };
beforeEach(()=>{
  vi.resetAllMocks(); mocks.getViewer.mockResolvedValue({name:"Member"}); mocks.createClient.mockResolvedValue({auth:{getUser:mocks.getUser},rpc:mocks.rpc});
  mocks.getUser.mockResolvedValue({data:{user:{id}},error:null}); mocks.rpc.mockResolvedValue({data:id,error:null});
  mocks.redirect.mockImplementation(()=>{throw new Error("REDIRECT");});
});
describe("booking server action with mocked Supabase",()=>{
  it("verifies auth and derives identity from the session, never submitted IDs",async()=>{
    await expect(confirmBooking({},form())).rejects.toThrow("REDIRECT");
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("create_booking",{p_space_id:id,p_date:"2027-01-05",p_start:"09:00",p_end:"10:00",p_request_id:id});
    expect(mocks.redirect).toHaveBeenCalledWith(`/dashboard/reservations/${id}`);
  });
  it("does not mutate after auth failure",async()=>{
    mocks.getUser.mockResolvedValue({data:{user:null},error:{code:"expired"}});
    expect((await confirmBooking({},form())).message).toContain("session has expired"); expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.getViewer.mockRejectedValue(new Error("AUTH_REDIRECT"));
    await expect(confirmBooking({},form())).rejects.toThrow("AUTH_REDIRECT");
  });
  it.each(["23P01","22023","PGRST202","unavailable"])("never shows success for %s",async code=>{
    mocks.rpc.mockResolvedValue({data:null,error:{code,message:"private database detail"}});
    const state = await confirmBooking({},form());
    expect(state.message).toBeTruthy(); expect(state.message).not.toContain("private database detail"); expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("keeps the same idempotency key across repeated confirmations",async()=>{
    for(let i=0;i<2;i++) await expect(confirmBooking({},form())).rejects.toThrow("REDIRECT");
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
  });
  it("validates selection before contacting the database",async()=>{
    const invalid = form(); invalid.set("start","09:15");
    expect((await confirmBooking({},invalid)).message).toBeTruthy(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("separates an authoritative user-schedule conflict after review from space conflicts",async()=>{
    mocks.rpc.mockResolvedValueOnce({data:null,error:{code:"PBR01",message:"private provider details",details:"other identifiers must not be displayed"}});
    expect(await confirmBooking({},form())).toEqual({message:userScheduleConflictMessage,conflict:"user-schedule"});
    expect(mocks.redirect).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({data:null,error:{code:"23P01"}});
    const spaceConflict=await confirmBooking({},form());
    expect(spaceConflict.message).toContain("taken or blocked");expect(spaceConflict.conflict).toBeUndefined();
  });
  it("does not infer user conflicts from an untrusted generic error message",async()=>{
    mocks.rpc.mockResolvedValue({data:null,error:{code:"unknown",message:"PBR01 User schedule conflict"}});
    expect((await confirmBooking({},form())).conflict).toBeUndefined();
  });
});
