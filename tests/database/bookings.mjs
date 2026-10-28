// Disposable PostgreSQL cluster only. Never reads project environment files or
// connects to Supabase. The auth schema below is a local test stub, not accounts.
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import { verifyCancellation } from "./cancellation.mjs";
import { verifyScheduleMigrationPreflight,verifyUserSchedule } from "./user-schedule.mjs";

const exec = promisify(execFile);
const bin = process.env.ROOMLY_TEST_PG_BIN ?? "C:/Program Files/PostgreSQL/17/bin";
const executable = name => path.join(bin,`${name}${process.platform === "win32" ? ".exe" : ""}`);
const folder = path.resolve(".tools",`booking-db-${randomUUID()}`);
const parent = path.resolve(".tools");
assert(folder.startsWith(parent + path.sep));
await mkdir(folder,{ recursive:true });
const data = path.join(folder,"data");
const port = 55482;
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith("PG"))), PGHOST:"127.0.0.1", PGPORT:String(port), PGUSER:"roomly_test", PGDATABASE:"postgres" };
const run = (name,args) => name !== "pg_ctl" ? exec(executable(name),args,{ env,windowsHide:true }) : new Promise((resolve,reject) => {
  const child = spawn(executable(name),args,{env,windowsHide:true,stdio:"ignore"});
  child.on("error",reject); child.on("exit",code=>code ? reject(new Error(`pg_ctl exited ${code}; inspect ${folder}`)) : resolve());
});
function sql(query) {
  return new Promise((resolve,reject) => {
    const child = spawn(executable("psql"),["-X","-qAt","-v","ON_ERROR_STOP=1"],{ env,windowsHide:true,stdio:["pipe","pipe","pipe"] });
    let out = "", error = "";
    child.stdout.on("data",value => out += value); child.stderr.on("data",value => error += value);
    child.on("error",reject); child.on("close",code => code ? reject(new Error(error)) : resolve(out.trim()));
    child.stdin.end(query);
  });
}
const userA = "bb000000-0000-4000-8000-000000000001", userB = "bb000000-0000-4000-8000-000000000002";
const space = "bc000000-0000-4000-8000-000000000001", otherSpace = "bc000000-0000-4000-8000-000000000002";
const session = (user = userA) => `set role authenticated; set request.jwt.claim.sub = '${user}';`;
const create = (start,end,key=randomUUID(),date="2090-01-09",room=space) => `select public.create_booking('${room}','${date}','${start}','${end}','${key}');`;
const rejects = async (query,pattern) => assert.rejects(() => sql(query),pattern);
let started = false;
try {
  await run("initdb",["-D",data,"-U","roomly_test","--auth=trust","--encoding=UTF8","--locale=C"]);
  await run("pg_ctl",["-D",data,"-l",path.join(folder,"server.log"),"-o",`-h 127.0.0.1 -p ${port} -F`,"-w","start"]);
  started = true;
  await sql(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  for (const file of (await readdir("supabase/migrations")).filter(file => file.endsWith(".sql")).sort()) {
    const migration=await readFile(path.join("supabase/migrations",file),"utf8");
    if(file === "20261027000100_prevent_user_booking_overlaps.sql") {
      await verifyScheduleMigrationPreflight(sql,migration,await readFile("supabase/preflight/20261027000100_user_reservation_overlaps.sql","utf8"));
    } else await sql(migration);
  }
  await sql(`insert into auth.users(id) values('${userA}'),('${userB}');
    insert into public.spaces(id,slug,name,description,type,floor,capacity,is_active) values
    ('${space}','test-space','Test space','Local integration fixture','meeting-room','1',8,true),
    ('${otherSpace}','unknown-hours','Unknown hours','Local integration fixture','study-room','1',4,true);
    insert into public.space_opening_hours(space_id,weekday,opens_at,closes_at)
    select '${space}',day,'00:00','23:30' from generate_series(0,6) day;`);
  const key = randomUUID();
  const id = await sql(session() + create("09:00","10:00",key));
  assert.match(id,/^[0-9a-f-]{36}$/);
  assert.equal(await sql(session() + create("09:00","10:00",key)),id,"retry must return original row");
  await rejects(session()+create("10:00","11:00",key),/Request key already used/);
  await rejects(session(userB)+create("09:30","10:30"),/reservations_no_overlap/);
  await sql(session()+create("10:00","10:30")); // adjacent valid, minimum 30
  await rejects(session()+create("10:15","11:00"),/Invalid selection/);
  await rejects(session()+create("11:00","11:00"),/Selection outside booking rules/);
  await rejects(session()+create("12:00","11:00"),/Selection outside booking rules/);
  await rejects(session()+create("23:00","23:30",randomUUID(),"2020-01-01"),/Selection outside booking rules/);
  await rejects(session()+create("23:30","00:00"),/Selection outside booking rules/);
  await rejects(session()+create("11:00","12:00",randomUUID(),"2090-01-09",otherSpace),/Opening hours unavailable/);
  await sql(`update public.space_opening_hours set opens_at='08:00',closes_at='20:00' where space_id='${space}';`);
  await rejects(session()+create("07:30","08:30"),/Selection outside booking rules/);
  await rejects(session()+create("19:30","20:30"),/Selection outside booking rules/);
  const blockStart = "2090-01-09 12:00 America/Chicago", blockEnd = "2090-01-09 13:00 America/Chicago";
  await sql(`insert into public.space_blocked_periods(space_id,starts_at,ends_at) values('${space}','${blockStart}','${blockEnd}');`);
  await rejects(session()+create("12:30","13:30"),/Occupied interval/);
  await sql(session()+create("13:00","13:30")); // block adjacency
  await rejects(`insert into public.space_blocked_periods(space_id,starts_at,ends_at) values('${space}','2090-01-09 09:30 America/Chicago','2090-01-09 10:00 America/Chicago');`,/Occupied interval/);
  // Race two actual concurrent connections, not a sequential mocked overlap check.
  const race = await Promise.allSettled([sql(session()+create("14:00","15:00")),sql(session(userB)+create("14:30","15:30"))]);
  assert.equal(race.filter(value=>value.status === "fulfilled").length,1);
  assert.match(race.find(value=>value.status === "rejected").reason.message,/reservations_no_overlap/);
  const retryKey = randomUUID();
  const retries = await Promise.all([sql(session()+create("16:00","17:00",retryKey)),sql(session()+create("16:00","17:00",retryKey))]);
  assert.equal(retries[0],retries[1]);
  const blockRace = await Promise.allSettled([
    sql(session()+create("18:00","19:00")),
    sql(`insert into public.space_blocked_periods(space_id,starts_at,ends_at) values('${space}','2090-01-09 18:30 America/Chicago','2090-01-09 19:30 America/Chicago');`),
  ]);
  assert.equal(blockRace.filter(value=>value.status === "fulfilled").length,1,"block/booking race must have exactly one winner");
  assert.match(blockRace.find(value=>value.status === "rejected").reason.message,/Occupied interval/);
  const row = JSON.parse(await sql(session()+`select row_to_json(r) from (select id,space_id,starts_at,ends_at,status from public.reservations where id='${id}') r;`));
  assert.equal(row.id,id);
  assert.equal(await sql(session(userB)+`select count(*) from public.reservations where id='${id}';`),"0");
  await rejects(session()+"select user_id,request_id from public.reservations;",/permission denied/);
  await rejects(session()+"select * from public.space_blocked_periods;",/permission denied/);
  await rejects(session()+`insert into public.reservations(user_id,space_id,starts_at,ends_at,request_id) values('${userA}','${space}',now(),now()+interval '1 hour','${randomUUID()}');`,/permission denied/);
  await rejects("set role anon;"+create("18:00","19:00"),/permission denied/);
  await rejects("set role authenticated;"+create("18:00","19:00"),/Authentication required/);
  const day = JSON.parse(await sql(session(userB)+`select public.booking_day('${space}','2090-01-09');`));
  assert.equal(day.state,"open");
  assert(day.occupied.some(row=>row.kind === "blocked"));
  for (const row of day.occupied) assert.deepEqual(Object.keys(row).sort(),["end","kind","start"]);
  assert.equal(JSON.parse(await sql(session()+`select public.booking_day('${otherSpace}','2090-01-09');`)).state,"unconfigured");
  await sql(`update public.space_opening_hours set is_closed=true,opens_at=null,closes_at=null where space_id='${space}' and weekday=extract(dow from date '2090-01-10');`);
  assert.equal(JSON.parse(await sql(session()+`select public.booking_day('${space}','2090-01-10');`)).state,"closed");
  await rejects(session()+create("09:00","10:00",randomUUID(),"2090-01-10"),/Opening hours unavailable/);
  // PostgreSQL timezone rules: skip and repeat rejected, winter/summer offsets differ.
  assert.equal(await sql("select roomly_private.chicago_instant('2027-03-14 02:30') is null;"),"t");
  assert.equal(await sql("select roomly_private.chicago_instant('2027-11-07 01:30') is null;"),"t");
  assert.equal(await sql("select extract(epoch from (roomly_private.chicago_instant('2027-03-14 03:30') - roomly_private.chicago_instant('2027-03-14 01:30')));"),"3600.000000");
  await rejects(session()+create("02:30","03:30",randomUUID(),"2090-03-12"),/Invalid daylight saving time/);
  // Cancelled rows release the half-open interval without deleting history.
  await sql(`update public.reservations set status='cancelled' where id='${id}';`);
  await sql(session(userB)+create("09:00","10:00"));
  await verifyCancellation({sql,session,space,otherSpace,userA,userB,create});
  await verifyUserSchedule({sql,session,userA,userB,create});
  await sql(`update public.spaces set is_active=false where id='${space}';`);
  await rejects(session()+`select public.booking_day('${space}','2090-01-09');`,/Space unavailable/);
  await rejects(session()+create("18:00","19:00"),/Space unavailable/);
  console.log("PASS: disposable PostgreSQL 17 — migrations, real constraints/RLS/grants, valid/minimum/invalid/past/outside/missing/closed/DST/blocked/adjacent/overlap, idempotent retries, concurrent overlaps, cancellation status, inactive spaces, minimal occupied ranges and owner-only reads. No Supabase connection.");
} finally {
  if (started) await run("pg_ctl",["-D",data,"-m","fast","-w","stop"]);
}
