begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions, pg_catalog;

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  space_id uuid not null references public.spaces(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id),
  check (isfinite(starts_at) and isfinite(ends_at)),
  check (ends_at >= starts_at + interval '30 minutes' and ends_at <= starts_at + interval '25 hours'),
  constraint reservations_no_overlap exclude using gist
    (space_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status = 'confirmed')
);
create index reservations_owner_idx on public.reservations(user_id, created_at desc);
create table public.space_blocked_periods (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (isfinite(starts_at) and isfinite(ends_at) and ends_at > starts_at)
);
create index space_blocks_range_idx on public.space_blocked_periods using gist
  (space_id, tstzrange(starts_at, ends_at, '[)'));

alter table public.reservations enable row level security;
alter table public.space_blocked_periods enable row level security;
revoke all on public.reservations, public.space_blocked_periods from public, anon, authenticated;
grant select (id, space_id, starts_at, ends_at, status, created_at, request_id) on public.reservations to authenticated;
create policy reservations_read_owner on public.reservations for select to authenticated
  using (user_id = (select auth.uid()));
-- Block records have no client policy/grant. Only clipped ranges leave the RPC.

-- Reject nonexistent AND ambiguous Chicago wall times rather than silently
-- choosing one side of a DST transition. No fixed UTC offset is assumed.
create function roomly_private.chicago_instant(p_local timestamp without time zone)
returns timestamptz language sql stable security invoker set search_path = '' as $$
  select case when count(*) = 1 then min(candidate) else null end
  from pg_catalog.generate_series(
    (p_local at time zone 'America/Chicago') - interval '3 hours',
    (p_local at time zone 'America/Chicago') + interval '3 hours', interval '30 minutes'
  ) as candidate
  where candidate at time zone 'America/Chicago' = p_local;
$$;
revoke all on function roomly_private.chicago_instant(timestamp without time zone) from public, anon, authenticated;

-- Admin-configured blocks and confirmations share a per-space row lock.
-- The exclusion constraint separately protects reservation/reservation races.
create function roomly_private.check_block_conflicts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.space_id <> old.space_id then
    raise exception using errcode = '22023', message = 'Block space cannot change';
  end if;
  perform 1 from public.spaces where id = new.space_id for update;
  if exists (select 1 from public.reservations r where r.space_id = new.space_id and r.status = 'confirmed'
    and pg_catalog.tstzrange(r.starts_at, r.ends_at, '[)') && pg_catalog.tstzrange(new.starts_at, new.ends_at, '[)')) then
    raise exception using errcode = '23P01', message = 'Occupied interval';
  end if;
  return new;
end;
$$;
revoke all on function roomly_private.check_block_conflicts() from public, anon, authenticated;
create trigger blocks_conflict_guard before insert or update on public.space_blocked_periods
  for each row execute function roomly_private.check_block_conflicts();
create trigger reservations_updated_at before update on public.reservations
  for each row execute function roomly_private.touch_catalog_updated_at();

create function public.booking_day(p_space_id uuid, p_date date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  hours public.space_opening_hours%rowtype;
  day_start timestamptz;
  day_end timestamptz;
  open_start timestamptz;
  open_end timestamptz;
  occupied jsonb;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_date is null or not pg_catalog.isfinite(p_date) then raise exception using errcode = '22023', message = 'Invalid date'; end if;
  if not exists (select 1 from public.spaces where id = p_space_id and is_active) then
    raise exception using errcode = '22023', message = 'Space unavailable';
  end if;
  select * into hours from public.space_opening_hours where space_id = p_space_id and weekday = extract(dow from p_date);
  if not found then return pg_catalog.jsonb_build_object('state','unconfigured','now',clock_timestamp()); end if;
  if hours.is_closed then return pg_catalog.jsonb_build_object('state','closed','now',clock_timestamp()); end if;
  open_start := roomly_private.chicago_instant(p_date + hours.opens_at);
  open_end := roomly_private.chicago_instant(p_date + hours.closes_at);
  if open_start is null or open_end is null then
    return pg_catalog.jsonb_build_object('state','dst','now',clock_timestamp());
  end if;
  day_start := p_date::timestamp at time zone 'America/Chicago';
  day_end := (p_date + 1)::timestamp at time zone 'America/Chicago';
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'start', greatest(starts_at, day_start), 'end', least(ends_at, day_end), 'kind', kind) order by starts_at), '[]'::jsonb)
  into occupied from (
    select starts_at, ends_at, 'booked' as kind from public.reservations
      where space_id = p_space_id and status = 'confirmed' and starts_at < day_end and ends_at > day_start
    union all
    select starts_at, ends_at, 'blocked' as kind from public.space_blocked_periods
      where space_id = p_space_id and starts_at < day_end and ends_at > day_start
  ) as ranges;
  return pg_catalog.jsonb_build_object('state','open','now',clock_timestamp(),
    'opensAt',open_start,'closesAt',open_end,'occupied',occupied);
end;
$$;
revoke all on function public.booking_day(uuid, date) from public, anon, authenticated;
grant execute on function public.booking_day(uuid, date) to authenticated;

create function public.create_booking(p_space_id uuid, p_date date, p_start time without time zone,
  p_end time without time zone, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  existing public.reservations%rowtype;
  hours public.space_opening_hours%rowtype;
  start_instant timestamptz;
  end_instant timestamptz;
  result_id uuid;
begin
  if owner_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_space_id is null or p_request_id is null or p_date is null or not pg_catalog.isfinite(p_date)
    or p_start is null or p_end is null or p_start >= time '24:00' or p_end >= time '24:00'
    or extract(second from p_start) <> 0 or extract(second from p_end) <> 0
    or mod(extract(minute from p_start)::integer,30) <> 0 or mod(extract(minute from p_end)::integer,30) <> 0 then
    raise exception using errcode = '22023', message = 'Invalid selection';
  end if;
  start_instant := roomly_private.chicago_instant(p_date + p_start);
  end_instant := roomly_private.chicago_instant(p_date + p_end);
  if start_instant is null or end_instant is null then
    raise exception using errcode = '22023', message = 'Invalid daylight saving time';
  end if;
  -- Serialize retries even if a malicious caller reuses a key for another space.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text || ':' || p_request_id::text, 0));
  select * into existing from public.reservations where user_id = owner_id and request_id = p_request_id;
  if found then
    if existing.space_id = p_space_id and existing.starts_at = start_instant and existing.ends_at = end_instant
      and existing.status = 'confirmed' then return existing.id; end if;
    raise exception using errcode = '22023', message = 'Request key already used';
  end if;
  perform 1 from public.spaces where id = p_space_id and is_active for update;
  if not found then raise exception using errcode = '22023', message = 'Space unavailable'; end if;
  select * into hours from public.space_opening_hours
    where space_id = p_space_id and weekday = extract(dow from p_date) for share;
  if not found or hours.is_closed then
    raise exception using errcode = '22023', message = 'Opening hours unavailable';
  end if;
  if start_instant <= clock_timestamp() or end_instant < start_instant + interval '30 minutes'
    or p_end <= p_start or p_start < hours.opens_at or p_end > hours.closes_at
    or roomly_private.chicago_instant(p_date + hours.opens_at) is null
    or roomly_private.chicago_instant(p_date + hours.closes_at) is null then
    raise exception using errcode = '22023', message = 'Selection outside booking rules';
  end if;
  if exists (select 1 from public.space_blocked_periods b where b.space_id = p_space_id
    and pg_catalog.tstzrange(b.starts_at,b.ends_at,'[)') && pg_catalog.tstzrange(start_instant,end_instant,'[)')) then
    raise exception using errcode = '23P01', message = 'Occupied interval';
  end if;
  insert into public.reservations(user_id,space_id,starts_at,ends_at,request_id)
    values(owner_id,p_space_id,start_instant,end_instant,p_request_id) returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.create_booking(uuid,date,time without time zone,time without time zone,uuid) from public, anon, authenticated;
grant execute on function public.create_booking(uuid,date,time without time zone,time without time zone,uuid) to authenticated;

commit;
