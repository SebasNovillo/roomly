begin;

create schema if not exists roomly_private;
revoke all on schema roomly_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  timezone text not null default 'America/Chicago'
    check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Explicit privileges: this project does not automatically expose new tables.
-- No client inserts/deletes, no updates to identity or timestamps, no anon access.
revoke all on table public.profiles from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, timezone) on table public.profiles to authenticated;

create policy profiles_read_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function roomly_private.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- This function is only intended for the auth.users AFTER INSERT trigger.
  if tg_op <> 'INSERT' or tg_table_schema <> 'auth' or tg_table_name <> 'users' then
    raise exception 'Invalid profile trigger context';
  end if;
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 100), ''), 'Member')
  );
  -- Ignore all other user metadata; users cannot supply roles or privileges.
  return new;
end;
$$;

revoke all on function roomly_private.create_profile_for_user() from public, anon, authenticated;
create trigger roomly_create_profile
  after insert on auth.users
  for each row execute function roomly_private.create_profile_for_user();

create function roomly_private.touch_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function roomly_private.touch_profile_updated_at() from public, anon, authenticated;
create trigger roomly_profile_updated_at
  before update on public.profiles
  for each row execute function roomly_private.touch_profile_updated_at();

-- Include users who registered before this migration was applied.
insert into public.profiles (id, full_name)
select id, coalesce(nullif(left(btrim(raw_user_meta_data ->> 'full_name'), 100), ''), 'Member')
from auth.users
on conflict (id) do nothing;

commit;
