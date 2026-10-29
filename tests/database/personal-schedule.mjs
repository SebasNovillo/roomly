import assert from "node:assert/strict";

export async function verifyPersonalScheduleReads({sql,session,userA,userB}) {
  const room="bf110000-0000-4000-8000-000000000001";
  await sql(`insert into public.spaces(id,slug,name,description,type,floor,capacity,is_active)
    values('${room}','personal-read-fixture','Personal read fixture','Local test only','meeting-room','1',8,true);
    insert into public.reservations(user_id,space_id,starts_at,ends_at,request_id,status) values
    ('${userA}','${room}','2098-01-07 09:00 America/Chicago','2098-01-07 10:00 America/Chicago',gen_random_uuid(),'confirmed'),
    ('${userA}','${room}','2098-01-07 10:00 America/Chicago','2098-01-07 11:00 America/Chicago',gen_random_uuid(),'confirmed'),
    ('${userA}','${room}','2098-01-07 11:00 America/Chicago','2098-01-07 12:00 America/Chicago',gen_random_uuid(),'cancelled'),
    ('${userB}','${room}','2098-01-07 12:00 America/Chicago','2098-01-07 13:00 America/Chicago',gen_random_uuid(),'confirmed');`);
  const read=(start,end,user=userA)=>sql(session(user)+`select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from
    (select id,space_id,starts_at,ends_at from public.reservations where status='confirmed'
    and starts_at < timestamptz '2098-01-07 ${end} America/Chicago'
    and ends_at > timestamptz '2098-01-07 ${start} America/Chicago' order by starts_at,id) r;`);
  for(const [start,end,count] of [["08:30","09:30",1],["09:30","10:30",2],["08:00","11:30",2],["09:15","09:45",1],["08:00","09:00",0],["11:00","12:00",0],["12:00","13:00",0]]) {
    assert.equal(JSON.parse(await read(start,end)).length,count,`${start}–${end}: strict overlap/adjacency/cancelled/owner filtering`);
  }
  assert.equal(JSON.parse(await read("08:00","14:00",userB)).length,1,"second user cannot read first user's two conflicts");
  const ownerRows=JSON.parse(await read("08:00","14:00"));
  assert.equal(ownerRows.length,2);
  for(const row of ownerRows) assert.deepEqual(Object.keys(row).sort(),["ends_at","id","space_id","starts_at"]);
  await sql(`update public.spaces set is_active=false where id='${room}';`);
  assert.equal(await sql(session()+`select count(*) from public.spaces where id='${room}';`),"0","inactive names are inaccessible through catalog RLS");
  assert.equal(JSON.parse(await read("08:00","14:00")).length,2,"owned conflicts remain visible without space metadata");
  console.log("PASS: personal precheck SELECT under real RLS/column grants — overlaps, containment, adjacency, cancelled rows, multiple conflicts and second-owner isolation.");
}
