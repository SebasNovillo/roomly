-- OPTIONAL fictional portfolio schedule, explicitly authorized demo data.
-- Run manually as database owner after catalog/details migrations and catalog seed.
-- Local wall-clock times in America/Chicago; not a fixed UTC offset.
-- Atlas, non-demo spaces, reservations and blocked periods are not targeted.
begin;

do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('a7100000-0000-4000-8000-000000000002'::uuid, 'willow-study-room'),
      ('a7100000-0000-4000-8000-000000000003'::uuid, 'horizon-conference-room'),
      ('a7100000-0000-4000-8000-000000000004'::uuid, 'focus-office'),
      ('a7100000-0000-4000-8000-000000000005'::uuid, 'studio-collaboration-room'),
      ('a7100000-0000-4000-8000-000000000006'::uuid, 'commons-coworking-area')
    ) as expected(id, slug)
    order by id
  loop
    -- Keep identity/demo status stable until commit, including concurrent edits.
    perform 1 from public.spaces
    where id = target.id and slug = target.slug and is_demo = true
    for share;
    if not found then
      raise exception 'Expected demo portfolio space is missing or mismatched: % (%)', target.slug, target.id
        using errcode = '23514',
          hint = 'Review the existing catalog records. No seed changes will be committed; do not relabel real spaces to force this seed.';
    end if;

    insert into public.space_opening_hours (space_id, weekday, is_closed, opens_at, closes_at)
    select target.id, day::smallint, false,
      case when day in (0, 6) then time '10:00' else time '08:00' end,
      case when day in (0, 6) then time '16:00'
           when day = 5 then time '18:00' else time '20:00' end
    from generate_series(0, 6) as weekdays(day)
    -- Preserve every configured row and its timestamps, including closed days.
    on conflict (space_id, weekday) do nothing;
  end loop;
end $$;

commit;
