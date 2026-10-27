begin;

alter table public.reservations add column cancelled_at timestamptz;
alter table public.reservations add constraint reservations_cancellation_time
  check (cancelled_at is null or (status = 'cancelled' and isfinite(cancelled_at)));
-- Legacy cancelled rows have no recorded cancellation instant. Preserve NULL
-- rather than inventing one from created_at/updated_at. They sort last.
grant select (cancelled_at) on public.reservations to authenticated;
create index reservations_upcoming_owner_idx on public.reservations(user_id, starts_at, id) where status = 'confirmed';
create index reservations_past_owner_idx on public.reservations(user_id, ends_at, starts_at desc) where status = 'confirmed';
create index reservations_cancelled_owner_idx on public.reservations(user_id, cancelled_at desc nulls last, id) where status = 'cancelled';

create function public.cancel_booking(p_reservation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  booking public.reservations%rowtype;
begin
  if owner_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  -- Read only to discover lock keys. Do NOT lock the reservation before its
  -- parent space: create_booking and block writes lock the space first.
  select * into booking from public.reservations where id = p_reservation_id and user_id = owner_id;
  if not found then raise exception using errcode = 'P0002', message = 'Booking not found'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text || ':' || booking.request_id::text, 0));
  perform 1 from public.spaces where id = booking.space_id for update;
  select * into booking from public.reservations where id = p_reservation_id and user_id = owner_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Booking not found'; end if;
  if booking.status = 'cancelled' then return booking.id; end if;
  if booking.status <> 'confirmed' or booking.starts_at <= clock_timestamp() then
    raise exception using errcode = '22023', message = 'Booking can no longer be cancelled';
  end if;
  update public.reservations set status = 'cancelled', cancelled_at = clock_timestamp()
    where id = booking.id;
  return booking.id;
end;
$$;
revoke all on function public.cancel_booking(uuid) from public, anon, authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- One statement snapshot and server-time boundary for all counts and the
-- bounded page. SECURITY INVOKER intentionally retains existing owner RLS and
-- active-space/image RLS; it never selects the ungranted user_id column.
create function public.my_bookings(p_tab text default 'upcoming', p_page integer default 1)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  boundary timestamptz := statement_timestamp();
  result jsonb;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_tab is null or p_tab not in ('upcoming','past','cancelled') or p_page is null or p_page < 1 or p_page > 1000000 then
    raise exception using errcode = '22023', message = 'Invalid booking page';
  end if;
  with owned as materialized (
    select id,space_id,starts_at,ends_at,status,cancelled_at,
      case when status = 'cancelled' then 'cancelled' when ends_at > boundary then 'upcoming' else 'past' end as category
    from public.reservations
  ), counts as (
    select count(*) filter (where category = 'upcoming') as upcoming,
      count(*) filter (where category = 'past') as past,
      count(*) filter (where category = 'cancelled') as cancelled,
      count(*) filter (where category = p_tab) as total from owned
  ), paging as (
    select *, least(p_page::bigint,greatest(1::bigint,(total + 11) / 12)) as page from counts
  ), selected as (
    select * from owned where category = p_tab
    order by case when p_tab = 'upcoming' then starts_at end asc,
      case when p_tab = 'past' then starts_at end desc,
      case when p_tab = 'cancelled' then cancelled_at end desc nulls last,
      case when p_tab = 'cancelled' then starts_at end desc, id
    limit 12 offset (select (page - 1) * 12 from paging)
  ), cards as (
    select r.id,r.space_id,r.starts_at,r.ends_at,r.status,r.cancelled_at,
      case when s.id is null then null else pg_catalog.jsonb_build_object(
        'id',s.id,'slug',s.slug,'name',s.name,'floor',s.floor,'image',photo.image) end as space
    from selected r
    left join public.spaces s on s.id = r.space_id and s.is_active
    left join lateral (
      select pg_catalog.jsonb_build_object('image_url',i.image_url,'alt_text',i.alt_text,
        'sort_order',i.sort_order,'source_credit',i.source_credit) as image
      from public.space_images i where i.space_id = s.id and i.is_active
      order by i.sort_order,i.id limit 1
    ) photo on true
    order by case when p_tab = 'upcoming' then r.starts_at end asc,
      case when p_tab = 'past' then r.starts_at end desc,
      case when p_tab = 'cancelled' then r.cancelled_at end desc nulls last,
      case when p_tab = 'cancelled' then r.starts_at end desc, r.id
  )
  select pg_catalog.jsonb_build_object('now',boundary,'page',paging.page,'pageSize',12,
    'counts',pg_catalog.jsonb_build_object('upcoming',upcoming,'past',past,'cancelled',cancelled),
    'total',total,'bookings',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(cards)) from cards),'[]'::jsonb))
  into result from paging;
  return result;
end;
$$;
revoke all on function public.my_bookings(text,integer) from public, anon, authenticated;
grant execute on function public.my_bookings(text,integer) to authenticated;

commit;
