-- Optional repeatable update, scoped only to the existing Atlas portfolio ID.
-- Observed in the rendered Figma Make Atlas detail page on 2026-10-21.
-- Other spaces' unseen descriptions, rules, hours and extra photos remain untouched.
begin;
do $$ begin
  if not exists (select 1 from public.spaces where id = 'a7100000-0000-4000-8000-000000000001'
    and slug = 'atlas-meeting-room' and is_demo) then
    raise exception 'Expected Atlas portfolio record is missing; review the catalog seed first';
  end if;
  if exists (select 1 from public.space_rules where id in (
    'a7400000-0000-4000-8000-000000000001', 'a7400000-0000-4000-8000-000000000002',
    'a7400000-0000-4000-8000-000000000003', 'a7400000-0000-4000-8000-000000000004'
  ) and space_id <> 'a7100000-0000-4000-8000-000000000001') or exists (
    select 1 from public.space_images where id in (
      'a7300000-0000-4000-8000-000000000001', 'a7300000-0000-4000-8000-000000000002'
    ) and space_id <> 'a7100000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Reserved detail IDs belong to another space; reconcile before seeding';
  end if;
end $$;

update public.spaces set description = 'A bright, polished meeting room designed for focused team conversations, client presentations, and collaborative working sessions.'
where id = 'a7100000-0000-4000-8000-000000000001' and slug = 'atlas-meeting-room' and is_demo;

insert into public.space_opening_hours (space_id, weekday, is_closed, opens_at, closes_at)
values
  ('a7100000-0000-4000-8000-000000000001', 0, false, '10:00', '16:00'),
  ('a7100000-0000-4000-8000-000000000001', 1, false, '08:00', '20:00'),
  ('a7100000-0000-4000-8000-000000000001', 2, false, '08:00', '20:00'),
  ('a7100000-0000-4000-8000-000000000001', 3, false, '08:00', '20:00'),
  ('a7100000-0000-4000-8000-000000000001', 4, false, '08:00', '20:00'),
  ('a7100000-0000-4000-8000-000000000001', 5, false, '08:00', '18:00'),
  ('a7100000-0000-4000-8000-000000000001', 6, false, '10:00', '16:00')
on conflict (space_id, weekday) do update set is_closed = excluded.is_closed,
  opens_at = excluded.opens_at, closes_at = excluded.closes_at;

insert into public.space_rules (id, space_id, sort_order, rule_text)
values
  ('a7400000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', 0, 'Respect the 8-person capacity.'),
  ('a7400000-0000-4000-8000-000000000002', 'a7100000-0000-4000-8000-000000000001', 1, 'Leave the space tidy and reset furniture.'),
  ('a7400000-0000-4000-8000-000000000003', 'a7100000-0000-4000-8000-000000000001', 2, 'Finish on time for the next member.'),
  ('a7400000-0000-4000-8000-000000000004', 'a7100000-0000-4000-8000-000000000001', 3, 'Keep noise at a considerate level.')
on conflict (id) do update set space_id = excluded.space_id, sort_order = excluded.sort_order, rule_text = excluded.rule_text;

insert into public.space_images (id, space_id, image_url, alt_text, sort_order, source_credit)
values
  ('a7300000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', '/images/spaces/atlas-meeting-room-2.jpg', 'Atlas gallery photo 2: a bright meeting space with a long table beside windows', 1, 'Unsplash'),
  ('a7300000-0000-4000-8000-000000000002', 'a7100000-0000-4000-8000-000000000001', '/images/spaces/atlas-meeting-room-3.jpg', 'Atlas gallery photo 3: a long table with orange chairs and glass partitions', 2, 'Unsplash')
on conflict (id) do update set space_id = excluded.space_id, image_url = excluded.image_url,
  alt_text = excluded.alt_text, sort_order = excluded.sort_order, source_credit = excluded.source_credit, is_active = true;
commit;
