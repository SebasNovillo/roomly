begin;
set local search_path = public, extensions, pg_catalog;

-- Hold the same lock required by ADD CONSTRAINT before inspecting legacy data,
-- so a new write cannot slip between the check and constraint installation.
lock table public.reservations in access exclusive mode;
do $$
begin
  if exists (
    select 1 from public.reservations a
    join public.reservations b on a.user_id = b.user_id and a.id < b.id
      and pg_catalog.tstzrange(a.starts_at,a.ends_at,'[)') && pg_catalog.tstzrange(b.starts_at,b.ends_at,'[)')
    where a.status = 'confirmed' and b.status = 'confirmed'
  ) then
    raise exception using errcode = '23514',
      message = 'Existing confirmed reservations overlap for a user; migration was not applied',
      hint = 'Run supabase/preflight/20261027000100_user_reservation_overlaps.sql and review conflicts manually. No reservations were changed.';
  end if;
end;
$$;

alter table public.reservations add constraint reservations_user_no_overlap
  exclude using gist (user_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
  where (status = 'confirmed');

-- Preserve request-id replay, existing validation and request/space lock order.
-- Only serialize new inserts by owner, and classify this one constraint failure.
create or replace function public.create_booking(p_space_id uuid, p_date date, p_start time without time zone,
  p_end time without time zone, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  existing public.reservations%rowtype;
  hours public.space_opening_hours%rowtype;
  start_instant timestamptz;
  end_instant timestamptz;
  result_id uuid;
  failed_constraint text;
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
  -- Separate two-integer advisory namespace from existing bigint request locks.
  -- Serializing owner inserts before any space lock avoids cross-space index
  -- races/deadlocks through this RPC. The exclusion constraint guards ALL writes.
  perform pg_catalog.pg_advisory_xact_lock(20261027, pg_catalog.hashtext(owner_id::text));
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
exception when exclusion_violation then
  get stacked diagnostics failed_constraint = constraint_name;
  if failed_constraint = 'reservations_user_no_overlap' then
    -- No constraint detail, conflicting IDs, times or owner identity leave RPC.
    raise exception using errcode = 'PBR01', message = 'User schedule conflict';
  end if;
  raise;
end;
$$;
revoke all on function public.create_booking(uuid,date,time without time zone,time without time zone,uuid) from public, anon, authenticated;
grant execute on function public.create_booking(uuid,date,time without time zone,time without time zone,uuid) to authenticated;

commit;
