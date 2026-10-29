import assert from "node:assert/strict";

// Verify the existing RPC contract used by Dashboard, against real local RLS.
export async function verifyDashboardSnapshot({sql,session,userA,userB}) {
  for(const user of [userA,userB]) {
    const snapshot=JSON.parse(await sql(session(user)+"select public.my_bookings('upcoming',1);"));
    const expected=JSON.parse(await sql(`select jsonb_build_object(
      'upcoming',count(*) filter(where status='confirmed' and ends_at > timestamptz '${snapshot.now}'),
      'past',count(*) filter(where status='confirmed' and ends_at <= timestamptz '${snapshot.now}'),
      'cancelled',count(*) filter(where status='cancelled')) from public.reservations where user_id='${user}';`));
    assert.deepEqual(snapshot.counts,expected,"full-history counts must use the very same snapshot boundary");
    assert(snapshot.bookings.length <= 12);
    const ids=JSON.parse(await sql(`select coalesce(jsonb_agg(id),'[]'::jsonb) from (
      select id from public.reservations where user_id='${user}' and status='confirmed'
      and ends_at > timestamptz '${snapshot.now}' order by starts_at,id limit 4) selected;`));
    assert.deepEqual(snapshot.bookings.slice(0,4).map(row=>row.id),ids,"featured plus three plans must be earliest owned confirmed not-ended rows");
    assert.equal(snapshot.total,snapshot.counts.upcoming);
    for(const row of snapshot.bookings) {
      assert.equal(row.status,"confirmed");assert(Date.parse(row.ends_at)>Date.parse(snapshot.now));assert(!("user_id" in row));
    }
  }
  console.log("PASS: Dashboard's existing bounded RPC — full-history category totals and first four owned not-ended entries at one server boundary, no user_id grant needed.");
}
