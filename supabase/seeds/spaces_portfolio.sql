-- OPTIONAL fictional portfolio data. Run manually as database owner AFTER the migration.
-- Names/types/floors/capacities/amenities/order and original photos were observed
-- in the rendered Figma Make catalog on 2026-10-20. Descriptions below are authored
-- summaries of those properties, NOT extracted Figma detail-page copy.
-- Stable IDs are reserved for these fixtures. Repeat runs update only these IDs;
-- slug conflicts with unrelated records deliberately fail rather than overwrite them.
begin;

insert into public.spaces (id, slug, name, description, type, floor, capacity, amenities, is_active, is_demo, sort_order)
values
  ('a7100000-0000-4000-8000-000000000001', 'atlas-meeting-room', 'Atlas Meeting Room',
   'A fictional portfolio meeting room on floor 2 for up to 8 people, with Wi-Fi, a whiteboard, and a display.',
   'meeting-room', '2', 8, array['wi-fi','whiteboard','display'], true, true, 0),
  ('a7100000-0000-4000-8000-000000000002', 'willow-study-room', 'Willow Study Room',
   'A fictional portfolio study room on floor 1 for up to 4 people, with Wi-Fi, a whiteboard, and power outlets.',
   'study-room', '1', 4, array['wi-fi','whiteboard','power-outlets'], true, true, 1),
  ('a7100000-0000-4000-8000-000000000003', 'horizon-conference-room', 'Horizon Conference Room',
   'A fictional portfolio conference room on floor 3 for up to 16 people, with a display, video conferencing, and Wi-Fi.',
   'conference-room', '3', 16, array['display','video-conferencing','wi-fi'], true, true, 2),
  ('a7100000-0000-4000-8000-000000000004', 'focus-office', 'Focus Office',
   'A fictional portfolio private office on floor 2 for up to 2 people, with Wi-Fi and power outlets.',
   'private-office', '2', 2, array['wi-fi','power-outlets'], true, true, 3),
  ('a7100000-0000-4000-8000-000000000005', 'studio-collaboration-room', 'Studio Collaboration Room',
   'A fictional portfolio collaboration room on floor 1 for up to 10 people, with a whiteboard, a display, and Wi-Fi.',
   'collaboration-room', '1', 10, array['whiteboard','display','wi-fi'], true, true, 4),
  ('a7100000-0000-4000-8000-000000000006', 'commons-coworking-area', 'Commons Coworking Area',
   'A fictional portfolio coworking area on floor 1 for up to 12 people, with Wi-Fi, power outlets, and a display.',
   'coworking-area', '1', 12, array['wi-fi','power-outlets','display'], true, true, 5)
on conflict (id) do update set
  slug = excluded.slug, name = excluded.name, description = excluded.description,
  type = excluded.type, floor = excluded.floor, capacity = excluded.capacity,
  amenities = excluded.amenities, is_active = excluded.is_active,
  is_demo = excluded.is_demo, sort_order = excluded.sort_order;

insert into public.space_images (id, space_id, image_url, alt_text, sort_order, source_credit)
values
  ('a7200000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', '/images/spaces/atlas-meeting-room.jpg', 'Atlas Meeting Room interior with a wooden table and brown chairs', 0, 'Unsplash'),
  ('a7200000-0000-4000-8000-000000000002', 'a7100000-0000-4000-8000-000000000002', '/images/spaces/willow-study-room.jpg', 'Willow Study Room interior with a table beside bright windows', 0, 'Unsplash'),
  ('a7200000-0000-4000-8000-000000000003', 'a7100000-0000-4000-8000-000000000003', '/images/spaces/horizon-conference-room.jpg', 'Horizon Conference Room interior with a long table and tall windows', 0, 'Unsplash'),
  ('a7200000-0000-4000-8000-000000000004', 'a7100000-0000-4000-8000-000000000004', '/images/spaces/focus-office.jpg', 'Focus Office interior', 0, 'Unsplash'),
  ('a7200000-0000-4000-8000-000000000005', 'a7100000-0000-4000-8000-000000000005', '/images/spaces/studio-collaboration-room.jpg', 'Studio Collaboration Room interior', 0, 'Unsplash'),
  ('a7200000-0000-4000-8000-000000000006', 'a7100000-0000-4000-8000-000000000006', '/images/spaces/commons-coworking-area.jpg', 'Commons Coworking Area interior', 0, 'Unsplash')
on conflict (id) do update set
  space_id = excluded.space_id, image_url = excluded.image_url, alt_text = excluded.alt_text,
  sort_order = excluded.sort_order, source_credit = excluded.source_credit, is_active = true;

commit;
