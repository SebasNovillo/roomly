import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function verifyCancellation({sql,session,space,otherSpace,userA,userB,create}) {
  const cancel = id => `select public.cancel_booking('${id}');`;
  const key = randomUUID();
  const id = await sql(session()+create("11:00","11:30",key));
  const original = JSON.parse(await sql(`select row_to_json(r) from public.reservations r where id='${id}';`));
  const before = JSON.parse(await sql(session()+`select public.booking_day('${space}','2090-01-09');`));
  assert(before.occupied.some(row=>Date.parse(row.start) === Date.parse(original.starts_at)));
  assert.equal(await sql(session(userB)+`select count(*) from public.reservations where id='${id}';`),"0");
  await assert.rejects(()=>sql(session(userB)+cancel(id)),/Booking not found/);
  await assert.rejects(()=>sql("set role anon;"+cancel(id)),/permission denied/);
  await assert.rejects(()=>sql("set role authenticated;"+cancel(id)),/Authentication required/);
  await assert.rejects(()=>sql(session()+cancel(randomUUID())),/Booking not found/);
  const cancelled = await Promise.all([sql(session()+cancel(id)),sql(session()+cancel(id))]);
  assert.deepEqual(cancelled,[id,id]);
  const history = JSON.parse(await sql(`select row_to_json(r) from public.reservations r where id='${id}';`));
  for(const column of ["id","space_id","user_id","request_id","starts_at","ends_at","created_at"]) assert.equal(history[column],original[column]);
  assert.equal(history.status,"cancelled"); assert(history.cancelled_at);
  assert.equal(await sql(session()+cancel(id)),id);
  assert.equal(await sql(`select cancelled_at from public.reservations where id='${id}';`),await sql(`select '${history.cancelled_at}'::timestamptz;`));
  await assert.rejects(()=>sql(session()+create("11:00","11:30",key)),/Request key already used/);
  const after = JSON.parse(await sql(session()+`select public.booking_day('${space}','2090-01-09');`));
  assert(!after.occupied.some(row=>Date.parse(row.start) === Date.parse(original.starts_at)));
  const replacement = await sql(session(userB)+create("11:00","11:30"));
  const race = await Promise.allSettled([
    sql(session(userB)+cancel(replacement)), sql(session()+create("11:00","11:30")),
  ]);
  assert.equal(race[0].status,"fulfilled");
  if(race[1].status === "rejected") { assert.match(race[1].reason.message,/reservations_no_overlap/); await sql(session()+create("11:00","11:30")); }
  assert.equal(await sql(`select count(*) from public.reservations where space_id='${space}' and starts_at='${original.starts_at}' and status='confirmed';`),"1");
  await assert.rejects(()=>sql(session()+`update public.reservations set status='confirmed',cancelled_at=null where id='${id}';`),/permission denied/);
  await assert.rejects(()=>sql(session()+`delete from public.reservations where id='${id}';`),/permission denied/);
  await assert.rejects(()=>sql(session()+"select user_id from public.reservations;"),/permission denied/);

  const ongoing = randomUUID(), past = randomUUID(), legacy = randomUUID();
  await sql(`insert into public.reservations(id,user_id,space_id,starts_at,ends_at,request_id,status) values
    ('${ongoing}','${userA}','${otherSpace}',clock_timestamp()-interval '10 minutes',clock_timestamp()+interval '30 minutes','${randomUUID()}','confirmed'),
    ('${past}','${userA}','${otherSpace}',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour','${randomUUID()}','confirmed'),
    ('${legacy}','${userA}','${otherSpace}','2085-01-01 12:00Z','2085-01-01 13:00Z','${randomUUID()}','cancelled');`);
  await assert.rejects(()=>sql(session()+cancel(ongoing)),/can no longer be cancelled/);
  await assert.rejects(()=>sql(session()+cancel(past)),/can no longer be cancelled/);
  // Unknown legacy timestamps remain unknown even on a safe repeat.
  await sql(session()+cancel(legacy));
  assert.equal(await sql(`select cancelled_at is null from public.reservations where id='${legacy}';`),"t");

  // More than one page. Owner B's row must affect neither owner A's counts nor cards.
  await sql(`insert into public.reservations(user_id,space_id,starts_at,ends_at,request_id)
    select '${userA}','${otherSpace}',t,t+interval '1 hour',gen_random_uuid()
    from generate_series(timestamptz '2091-01-01 12:00Z',timestamptz '2091-01-14 12:00Z',interval '1 day') t;
    insert into public.reservations(user_id,space_id,starts_at,ends_at,request_id)
    values('${userB}','${otherSpace}','2092-01-01 12:00Z','2092-01-01 13:00Z','${randomUUID()}');`);
  const list = async(tab,page=1,user=userA) => JSON.parse(await sql(session(user)+`select public.my_bookings('${tab}',${page});`));
  const upcoming = await list("upcoming");
  assert.equal(upcoming.pageSize,12); assert.equal(upcoming.bookings.length,12); assert(upcoming.total > 12);
  assert(upcoming.bookings.some(row=>row.id === ongoing));
  assert(upcoming.bookings.every(row=>row.status === "confirmed" && Date.parse(row.ends_at) > Date.parse(upcoming.now)));
  assert.deepEqual(upcoming.bookings.map(row=>row.starts_at),[...upcoming.bookings.map(row=>row.starts_at)].sort());
  const expected = JSON.parse(await sql(`select jsonb_build_object('upcoming',count(*) filter(where status='confirmed' and ends_at>'${upcoming.now}'),
    'past',count(*) filter(where status='confirmed' and ends_at<='${upcoming.now}'),'cancelled',count(*) filter(where status='cancelled'))
    from public.reservations where user_id='${userA}';`));
  assert.deepEqual(upcoming.counts,expected); assert.equal(upcoming.total,expected.upcoming);
  const second = await list("upcoming",2); assert(second.bookings.length > 0);
  assert(!second.bookings.some(row=>upcoming.bookings.some(first=>first.id === row.id)));
  assert.equal((await list("upcoming",999999)).page,Math.ceil(upcoming.total/12));
  const pastList = await list("past"); assert(pastList.bookings.some(row=>row.id === past));
  assert(!pastList.bookings.some(row=>row.id === ongoing));
  assert(pastList.bookings.every(row=>row.status === "confirmed" && Date.parse(row.ends_at) <= Date.parse(pastList.now)));
  const cancelledList = await list("cancelled");
  assert(cancelledList.bookings.some(row=>row.id === id));
  assert(cancelledList.bookings.every(row=>row.status === "cancelled"));
  const known = cancelledList.bookings.filter(row=>row.cancelled_at).map(row=>Date.parse(row.cancelled_at));
  assert.deepEqual(known,[...known].sort((a,b)=>b-a));
  assert.equal(cancelledList.bookings.at(-1).cancelled_at,null);
  const other = await list("cancelled",1,userB); assert(!other.bookings.some(row=>row.id === id));
  assert(!JSON.stringify(upcoming).includes('"user_id"')); assert(!JSON.stringify(upcoming).includes('"request_id"'));
  await sql(`update public.spaces set is_active=false where id='${otherSpace}';`);
  const hidden = await list("upcoming"); assert(hidden.bookings.some(row=>row.space_id === otherSpace && row.space === null));
  // Owner can cancel even if the catalog metadata has become inactive.
  const hiddenFuture = hidden.bookings.find(row=>row.space_id === otherSpace && Date.parse(row.starts_at) > Date.parse(hidden.now));
  assert(hiddenFuture); await sql(session()+cancel(hiddenFuture.id));
  await sql(`update public.spaces set is_active=true where id='${otherSpace}';`);
  await assert.rejects(()=>sql("set role anon; select public.my_bookings('upcoming',1);"),/permission denied/);
  await assert.rejects(()=>sql("set role authenticated; select public.my_bookings('upcoming',1);"),/Authentication required/);
  await assert.rejects(()=>sql(session()+"select public.my_bookings('invalid',0);"),/Invalid booking page/);
  console.log("PASS: PostgreSQL cancellation/list — owner isolation, grant checks, ongoing/past refusal, concurrent/idempotent cancellation, preserved history/request key, availability release and rebooking, cancellation/creation race, full counts and bounded pagination, sorting and inactive metadata.");
}
