begin;

-- Additive detail content only. Requires the previously applied catalog migration.
-- Times are local wall-clock times in America/Chicago, not booking availability.
-- A missing weekday row means unconfigured; only is_closed=true means closed.
create table public.space_opening_hours (
  space_id uuid not null references public.spaces(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- Sunday = 0
  is_closed boolean not null default false,
  opens_at time(0) without time zone,
  closes_at time(0) without time zone,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (space_id, weekday),
  check ((is_closed and opens_at is null and closes_at is null) or
    (not is_closed and opens_at is not null and closes_at is not null
     and opens_at < closes_at and closes_at < time '24:00'
     and extract(second from opens_at) = 0 and extract(second from closes_at) = 0)),
  check (updated_at >= created_at)
);

create table public.space_rules (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  rule_text text not null check (char_length(btrim(rule_text)) between 1 and 1000),
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, sort_order),
  check (updated_at >= created_at)
);
-- The composite primary/unique indexes cover parent lookups and display ordering.
alter table public.space_opening_hours enable row level security;
alter table public.space_rules enable row level security;
revoke all on table public.space_opening_hours, public.space_rules from public, anon, authenticated;
grant select on table public.space_opening_hours, public.space_rules to authenticated;

create policy space_opening_hours_read_active on public.space_opening_hours
  for select to authenticated using (exists (
    select 1 from public.spaces as space where space.id = space_opening_hours.space_id and space.is_active
  ));
create policy space_rules_read_active on public.space_rules
  for select to authenticated using (exists (
    select 1 from public.spaces as space where space.id = space_rules.space_id and space.is_active
  ));

create trigger space_opening_hours_updated_at before update on public.space_opening_hours
  for each row execute function roomly_private.touch_catalog_updated_at();
create trigger space_rules_updated_at before update on public.space_rules
  for each row execute function roomly_private.touch_catalog_updated_at();

commit;
