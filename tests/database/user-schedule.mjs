import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function verifyScheduleMigrationPreflight(sql,migration,preflight) {
  // This runs only in the new disposable cluster created by bookings.mjs.
  const user="bf000000-0000-4000-8000-000000000001";
  const roomA="bf000000-0000-4000-8000-000000000002",roomB="bf000000-0000-4000-8000-000000000003";
  await sql(`insert into auth.users(id) values('${user}');
    insert into public.spaces(id,slug,name,description,type,floor,capacity,is_active) values
    ('${roomA}','preflight-a','Preflight A','Disposable test fixture','meeting-room','1',4,true),
    ('${roomB}','preflight-b','Preflight B','Disposable test fixture','meeting-room','1',4,true);
    insert into public.reservations(user_id,space_id,starts_at,ends_at,request_id) values
    ('${user}','${roomA}','2099-01-01 12:00Z','2099-01-01 13:00Z','${randomUUID()}'),
    ('${user}','${roomB}','2099-01-01 12:30Z','2099-01-01 13:30Z','${randomUUID()}');`);
  const snapshot=()=>sql("select jsonb_agg(to_jsonb(r) order by id) from public.reservations r;");
  const original=await snapshot();
  const body=await sql("select pg_get_functiondef('public.create_booking(uuid,date,time,time,uuid)'::regprocedure);");
  const query=preflight.trim().replace(/;$/,"");
  assert.equal(await sql(`select count(*) from (${query}) conflicts;`),"1");
  await assert.rejects(()=>sql(migration),/Existing confirmed reservations overlap for a user; migration was not applied/);
  assert.equal(await snapshot(),original);
  assert.equal(await sql("select pg_get_functiondef('public.create_booking(uuid,date,time,time,uuid)'::regprocedure);"),body);
  assert.equal(await sql("select count(*) from pg_constraint where conrelid='public.reservations'::regclass and conname='reservations_user_no_overlap';"),"0");
  // Remove only the disposable legacy fixtures so the clean migration can run.
  await sql(`delete from public.reservations where user_id='${user}';delete from public.spaces where id in ('${roomA}','${roomB}');delete from auth.users where id='${user}';`);
  assert.equal(await sql(`select count(*) from (${query}) conflicts;`),"0");
  await sql(migration);
  console.log("PASS: user-schedule preflight detects legacy overlaps; failed installation preserves records/RPC; clean installation succeeds.");
}

export async function verifyUserSchedule({sql,session,userA,userB,create}) {
  const roomA="bf000000-0000-4000-8000-000000000004",roomB="bf000000-0000-4000-8000-000000000005";
  await sql(`insert into public.spaces(id,slug,name,description,type,floor,capacity,is_active) values
    ('${roomA}','schedule-a','Schedule A','Disposable test fixture','meeting-room','1',4,true),
    ('${roomB}','schedule-b','Schedule B','Disposable test fixture','meeting-room','1',4,true);
    insert into public.space_opening_hours(space_id,weekday,opens_at,closes_at)
    select room,day,'08:00','20:00' from unnest(array['${roomA}','${roomB}']::uuid[]) room cross join generate_series(0,6) day;`);
  const date="2096-06-05";
  const book=(room,start,end,key=randomUUID(),day=date)=>create(start,end,key,day,room);
  const userConflict=async query=>assert.rejects(()=>sql("\\set VERBOSITY verbose\n"+query),/PBR01: User schedule conflict/);
  const key=randomUUID(),original=await sql(session()+book(roomA,"09:00","10:00",key));
  for(const [start,end] of [["09:30","10:30"],["08:30","09:30"],["09:00","10:00"],["08:00","11:00"]]) await userConflict(session()+book(roomB,start,end));
  await sql(session()+book(roomB,"08:00","09:00"));
  await sql(session()+book(roomB,"10:00","11:00"));
  await assert.rejects(()=>sql(session(userB)+book(roomA,"09:30","10:00")),/reservations_no_overlap/);
  await sql(session(userB)+book(roomB,"09:00","10:00"));
  assert.equal(await sql(session()+book(roomA,"09:00","10:00",key)),original);
  await assert.rejects(()=>sql(session()+book(roomB,"11:00","12:00",key)),/Request key already used/);
  const available=JSON.parse(await sql(session()+`select public.booking_day('${roomA}','${date}');`));
  const target=Date.parse(await sql(`select ('${date} 10:00 America/Chicago')::timestamptz;`));
  assert(!available.occupied.some(row=>Date.parse(row.start)<=target && Date.parse(row.end)>target));
  await userConflict(session()+book(roomA,"10:00","10:30"));
  for(const range of available.occupied) assert.deepEqual(Object.keys(range).sort(),["end","kind","start"]);
  assert.equal(await sql(session(userB)+`select count(*) from public.reservations where id='${original}';`),"0");
  const cancelledDay="2096-06-06";
  const cancelled=await sql(session()+book(roomA,"09:00","10:00",randomUUID(),cancelledDay));
  await sql(session()+`select public.cancel_booking('${cancelled}');`);
  await sql(session()+book(roomB,"09:00","10:00",randomUUID(),cancelledDay));
  assert.equal(await sql(`select status from public.reservations where id='${cancelled}';`),"cancelled");
  await assert.rejects(()=>sql(`insert into public.reservations(user_id,space_id,starts_at,ends_at,request_id)
    values('${userA}','${roomA}','${cancelledDay} 09:30 America/Chicago','${cancelledDay} 10:30 America/Chicago','${randomUUID()}');`),/reservations_user_no_overlap/);
  const day="2096-06-07";
  const race=await Promise.allSettled([sql(session()+book(roomA,"09:00","10:00",randomUUID(),day)),sql(session()+book(roomB,"09:30","10:30",randomUUID(),day))]);
  assert.equal(race.filter(row=>row.status === "fulfilled").length,1);
  assert.match(race.find(row=>row.status === "rejected").reason.message,/User schedule conflict/);
  const retryKey=randomUUID(),retryDay="2096-06-08";
  const retries=await Promise.all([sql(session()+book(roomA,"09:00","10:00",retryKey,retryDay)),sql(session()+book(roomA,"09:00","10:00",retryKey,retryDay))]);
  assert.equal(retries[0],retries[1]);
  assert.equal(await sql(`select count(*) from public.reservations where user_id='${userA}' and request_id='${retryKey}';`),"1");
  const racingDay="2096-06-09",old=await sql(session()+book(roomA,"09:00","10:00",randomUUID(),racingDay));
  const cancellationRace=await Promise.allSettled([sql(session()+`select public.cancel_booking('${old}');`),sql(session()+book(roomB,"09:00","10:00",randomUUID(),racingDay))]);
  assert.equal(cancellationRace[0].status,"fulfilled");
  if(cancellationRace[1].status === "rejected") {assert.match(cancellationRace[1].reason.message,/User schedule conflict/);await sql(session()+book(roomB,"09:00","10:00",randomUUID(),racingDay));}
  assert.equal(await sql(`select count(*) from public.reservations where user_id='${userA}' and status='confirmed' and starts_at='${racingDay} 09:00 America/Chicago';`),"1");
  const separateDay="2096-06-10";
  const independent=await Promise.all([sql(session()+book(roomA,"09:00","10:00",randomUUID(),separateDay)),sql(session(userB)+book(roomB,"09:00","10:00",randomUUID(),separateDay))]);
  assert.equal(new Set(independent).size,2);
  // Also exercise atomic enforcement without the RPC's owner advisory lock.
  const directDay="2096-06-11";
  const direct=room=>sql(`insert into public.reservations(user_id,space_id,starts_at,ends_at,request_id)
    values('${userA}','${room}','${directDay} 09:00 America/Chicago','${directDay} 10:00 America/Chicago','${randomUUID()}') returning id;`);
  const directRace=await Promise.allSettled([direct(roomA),direct(roomB)]);
  assert.equal(directRace.filter(row=>row.status === "fulfilled").length,1);
  assert.match(directRace.find(row=>row.status === "rejected").reason.message,/reservations_user_no_overlap|deadlock detected/);
  assert.equal(await sql(`select count(*) from public.reservations where user_id='${userA}' and status='confirmed' and starts_at='${directDay} 09:00 America/Chicago';`),"1");
  console.log("PASS: PostgreSQL user schedule — cross-space overlaps/adjacencies, cancelled exclusion, different users, original space guard, truthful availability, RLS, direct constraint, concurrent requests/retries and cancellation race.");
}
