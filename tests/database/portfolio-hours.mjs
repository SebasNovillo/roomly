import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Called only by the disposable local PostgreSQL runner; no remote connection.
export async function verifyPortfolioHours(sql) {
  const seed = await readFile("supabase/seeds/remaining_portfolio_opening_hours.sql", "utf8");
  const catalog = await readFile("supabase/seeds/spaces_portfolio.sql", "utf8");
  const atlas = "a7100000-0000-4000-8000-000000000001";
  const willow = "a7100000-0000-4000-8000-000000000002";
  const horizon = "a7100000-0000-4000-8000-000000000003";
  const commons = "a7100000-0000-4000-8000-000000000006";
  const snapshot = table => sql(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from public.${table} t;`);
  await sql(catalog);
  // Fail late, after earlier targets would have inserted rows: all must roll back.
  await sql(`delete from public.spaces where id='${commons}';`);
  await assert.rejects(() => sql(seed), /Expected demo portfolio space is missing or mismatched/);
  assert.equal(await sql("select count(*) from public.space_opening_hours where space_id::text like 'a710%';"), "0");
  await sql(catalog);
  for (const assignment of ["is_demo=false", "slug='renamed-portfolio-space'"]) {
    await sql(`update public.spaces set ${assignment} where id='${commons}';`);
    await assert.rejects(() => sql(seed), /Expected demo portfolio space is missing or mismatched/);
    assert.equal(await sql("select count(*) from public.space_opening_hours where space_id::text like 'a710%';"), "0");
    await sql(`update public.spaces set is_demo=true,slug='commons-coworking-area' where id='${commons}';`);
  }
  await sql(await readFile("supabase/seeds/space_details_portfolio.sql", "utf8"));
  await sql(`insert into public.space_opening_hours(space_id,weekday,is_closed,opens_at,closes_at) values
    ('${willow}',1,true,null,null),('${horizon}',5,false,'09:00','17:00');`);
  const preserved = await snapshot("space_opening_hours");
  const untouched = {};
  for (const table of ["spaces", "space_images", "space_rules", "reservations", "space_blocked_periods"]) untouched[table] = await snapshot(table);
  await sql(seed);
  const after = await snapshot("space_opening_hours");
  const rows = JSON.parse(after);
  for (const row of JSON.parse(preserved)) assert.deepEqual(rows.find(value => value.space_id === row.space_id && value.weekday === row.weekday), row);
  const targets = rows.filter(row => row.space_id.startsWith("a710") && row.space_id !== atlas);
  assert.equal(targets.length, 35);
  for (const row of targets) {
    if ((row.space_id === willow && row.weekday === 1) || (row.space_id === horizon && row.weekday === 5)) continue;
    assert.equal(row.is_closed, false);
    assert.equal(row.opens_at, [0, 6].includes(row.weekday) ? "10:00:00" : "08:00:00");
    assert.equal(row.closes_at, [0, 6].includes(row.weekday) ? "16:00:00" : row.weekday === 5 ? "18:00:00" : "20:00:00");
  }
  await sql(seed);
  assert.equal(await snapshot("space_opening_hours"), after, "rerun must preserve rows and timestamps");
  const docs = await readFile("docs/bookings.md", "utf8");
  const section = docs.slice(docs.indexOf("## Optional remaining portfolio opening hours"));
  const verification = section.match(/```sql\r?\n([\s\S]*?)```/)[1];
  const report = (await sql(verification)).split("\n");
  assert.equal(report.length, 35, "documented read-only query must show every expected weekday");
  assert(report.every(row => row.split("|")[2] === "t"));
  for (const [table, before] of Object.entries(untouched)) assert.equal(await snapshot(table), before, `${table} must remain unchanged`);
  console.log("PASS: optional portfolio hours seed — exact schedule, missing/mismatched/non-demo rollback, existing open/closed settings preserved, Atlas/non-targets untouched and repeatable without timestamp changes.");
}
