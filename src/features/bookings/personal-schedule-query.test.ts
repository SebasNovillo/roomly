import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({getViewer:vi.fn(),createClient:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),lt:vi.fn(),gt:vi.fn(),order:vi.fn(),in:vi.fn(),rows:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/features/auth/viewer",()=>({getViewer:mocks.getViewer}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
import { getPersonalConflicts } from "./personal-schedule-query";
const id="bb000000-0000-4000-8000-000000000001",room="bc000000-0000-4000-8000-000000000001";
const selection={date:"2027-01-05",start:"09:00",end:"10:00"};
const row={id,space_id:room,starts_at:"2027-01-05T15:30:00Z",ends_at:"2027-01-05T16:30:00Z"};
beforeEach(()=>{
  vi.resetAllMocks();mocks.getViewer.mockResolvedValue({name:"Member"});
  const chain={...mocks,then:(resolve: (value: unknown)=>unknown,reject: (reason: unknown)=>unknown)=>Promise.resolve(mocks.rows()).then(resolve,reject)};
  mocks.createClient.mockResolvedValue({from:mocks.from});
  for(const name of ["from","select","eq","lt","gt","order"] as const) mocks[name].mockReturnValue(chain);
  mocks.rows.mockReturnValue({data:[row],error:null});
  mocks.in.mockResolvedValue({data:[{id:room,name:"Horizon Conference Room"}],error:null});
});
describe("personal conflict reads under existing owner RLS (mocked transport)",()=>{
  it("authenticates before reads; never accepts or selects a submitted owner",async()=>{
    mocks.getViewer.mockRejectedValue(new Error("AUTH_REDIRECT"));
    await expect(getPersonalConflicts(selection)).rejects.toThrow("AUTH_REDIRECT");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("uses confirmed-only strict half-open comparisons and returns minimal owned details",async()=>{
    expect(await getPersonalConflicts(selection)).toEqual({conflicts:[{id,startsAt:row.starts_at,endsAt:row.ends_at,spaceName:"Horizon Conference Room"}]});
    expect(mocks.select.mock.calls).toEqual([["id,space_id,starts_at,ends_at"],["id,name"]]);
    expect(mocks.eq.mock.calls).toEqual([["status","confirmed"],["is_active",true]]);
    expect(mocks.lt).toHaveBeenCalledWith("starts_at","2027-01-05T16:00:00.000Z");
    expect(mocks.gt).toHaveBeenCalledWith("ends_at","2027-01-05T15:00:00.000Z");
    expect(mocks.in).toHaveBeenCalledWith("id",[room]);
  });
  it("keeps multiple conflicts and falls back when metadata is missing or unreadable",async()=>{
    const other={...row,id:"bb000000-0000-4000-8000-000000000002",space_id:"bc000000-0000-4000-8000-000000000002"};
    mocks.rows.mockReturnValue({data:[row,other],error:null});
    const result=await getPersonalConflicts(selection);
    expect(result?.conflicts.map(row=>row.spaceName)).toEqual(["Horizon Conference Room",null]);
    mocks.in.mockRejectedValue(new Error("private metadata error"));
    expect((await getPersonalConflicts(selection))?.conflicts.map(row=>row.spaceName)).toEqual([null,null]);
  });
  it("distinguishes successful no-conflicts from failed or malformed reads",async()=>{
    mocks.rows.mockReturnValue({data:[],error:null});
    expect(await getPersonalConflicts(selection)).toEqual({conflicts:[]});expect(mocks.in).not.toHaveBeenCalled();
    mocks.rows.mockReturnValue({data:null,error:{code:"42501"}});expect(await getPersonalConflicts(selection)).toBeNull();
    mocks.rows.mockReturnValue({data:[{id}],error:null});expect(await getPersonalConflicts(selection)).toBeNull();
    mocks.createClient.mockRejectedValue(new Error("private service detail"));expect(await getPersonalConflicts(selection)).toBeNull();
  });
  it.each([{...selection,end:"09:00"},{...selection,start:"09:15"},{date:"2027-03-14",start:"02:30",end:"03:30"}])("rejects invalid wall-clock intervals before querying (%j)",async value=>{
    expect(await getPersonalConflicts(value)).toBeNull();expect(mocks.from).not.toHaveBeenCalled();
  });
});
