import { beforeEach,describe,expect,it,vi } from "vitest";
const mocks = vi.hoisted(()=>({getViewer:vi.fn(),createClient:vi.fn(),getUser:vi.fn(),rpc:vi.fn(),revalidatePath:vi.fn(),redirect:vi.fn()}));
vi.mock("@/features/auth/viewer",()=>({getViewer:mocks.getViewer}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidatePath}));
vi.mock("next/navigation",()=>({redirect:mocks.redirect}));
import { cancelReservation } from "./cancellation";
const id="bb000000-0000-4000-8000-000000000001";
const form=()=>{const result=new FormData();result.set("reservationId",id);result.set("userId","untrusted");return result;};
beforeEach(()=>{
  vi.resetAllMocks();mocks.getViewer.mockResolvedValue({name:"Member"});mocks.createClient.mockResolvedValue({auth:{getUser:mocks.getUser},rpc:mocks.rpc});
  mocks.getUser.mockResolvedValue({data:{user:{id}},error:null});mocks.rpc.mockResolvedValue({data:id,error:null});
  mocks.redirect.mockImplementation(()=>{throw new Error("REDIRECT");});
});
describe("cancellation server action with mocked Supabase",()=>{
  it("verifies session, passes only the reservation ID and refreshes dependent routes after confirmed success",async()=>{
    await expect(cancelReservation({},form())).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith(`/dashboard/bookings?tab=cancelled&cancelled=${id}`);
    expect(mocks.getUser).toHaveBeenCalledOnce();expect(mocks.rpc).toHaveBeenCalledWith("cancel_booking",{p_reservation_id:id});
    expect(mocks.revalidatePath.mock.calls).toEqual([["/dashboard/bookings"],[`/dashboard/reservations/${id}`],["/dashboard/spaces","layout"]]);
  });
  it.each(["22023","P0002","PGRST202","42501"])("preserves truthful failure for %s without exposing provider details",async code=>{
    mocks.rpc.mockResolvedValue({data:null,error:{code,message:"private detail"}});
    const state=await cancelReservation({},form());expect(state.message).toBeTruthy();expect(state.cancelledId).toBeUndefined();expect(state.message).not.toContain("private detail");expect(mocks.revalidatePath).not.toHaveBeenCalled();expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("requires the exact confirmed ID, not just a successful transport",async()=>{
    mocks.rpc.mockResolvedValue({data:null,error:null});expect((await cancelReservation({},form())).cancelledId).toBeUndefined();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("rejects invalid input and expired sessions before cancellation",async()=>{
    expect((await cancelReservation({},new FormData())).message).toBeTruthy();expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({data:{user:null},error:{code:"expired"}});expect((await cancelReservation({},form())).message).toContain("session has expired");expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.getViewer.mockRejectedValue(new Error("AUTH_REDIRECT"));await expect(cancelReservation({},form())).rejects.toThrow("AUTH_REDIRECT");
  });
  it("keeps repeated requests safe with the same reservation identifier",async()=>{
    await expect(cancelReservation({},form())).rejects.toThrow("REDIRECT");await expect(cancelReservation({},form())).rejects.toThrow("REDIRECT");expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
  });
});
