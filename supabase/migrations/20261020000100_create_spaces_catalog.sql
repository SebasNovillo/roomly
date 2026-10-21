begin;

-- Catalog only. No reservations, availability, storage buckets, or Auth changes.
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 1 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null check (char_length(btrim(description)) between 1 and 5000),
  type text not null check (type in ('meeting-room', 'study-room', 'conference-room', 'private-office', 'collaboration-room', 'coworking-area')),
  floor text not null check (char_length(btrim(floor)) between 1 and 60),
  capacity integer not null check (capacity between 1 and 10000),
  amenities text[] not null default '{}' check (
    cardinality(amenities) <= 20 and array_position(amenities, null) is null
    and amenities <@ array['wi-fi', 'whiteboard', 'display', 'power-outlets', 'video-conferencing']::text[]
  ),
  is_active boolean not null default false,
  is_demo boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  search_text text generated always as (name || ' ' || description) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (updated_at >= created_at)
);

create table public.space_images (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  image_url text not null check (char_length(image_url) <= 2048 and (
    image_url ~ '^/images/spaces/[a-z0-9-]+\.(jpg|jpeg|png|webp)$'
    or image_url ~ '^https://[^[:space:]]+$'
  )),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 240),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  source_credit text check (source_credit is null or char_length(btrim(source_credit)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, sort_order),
  check (updated_at >= created_at)
);

create index spaces_active_order_idx on public.spaces (sort_order, id) where is_active;
create index spaces_active_type_capacity_idx on public.spaces (type, capacity) where is_active;
create index spaces_active_capacity_idx on public.spaces (capacity) where is_active;
create index spaces_active_amenities_idx on public.spaces using gin (amenities) where is_active;
-- The image unique constraint also indexes its space_id foreign key.
-- Substring search intentionally has no new extension dependency for this small catalog.

alter table public.spaces enable row level security;
alter table public.space_images enable row level security;
revoke all on table public.spaces, public.space_images from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.spaces, public.space_images to authenticated;

create policy spaces_read_active on public.spaces for select to authenticated
  using (is_active);
create policy space_images_read_active on public.space_images for select to authenticated
  using (is_active and exists (
    select 1 from public.spaces as space
    where space.id = space_images.space_id and space.is_active
  ));

create schema if not exists roomly_private;
revoke all on schema roomly_private from public, anon, authenticated;
create function roomly_private.touch_catalog_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function roomly_private.touch_catalog_updated_at() from public, anon, authenticated;
create trigger spaces_updated_at before update on public.spaces
  for each row execute function roomly_private.touch_catalog_updated_at();
create trigger space_images_updated_at before update on public.space_images
  for each row execute function roomly_private.touch_catalog_updated_at();

commit;
