-- Read-only administrator preflight. Run as database owner in the intended
-- project's SQL Editor; do not publish these private reservation identifiers.
-- An empty result means no conflicting pairs in this statement's snapshot.
select a.user_id,
  a.id as first_reservation_id, b.id as second_reservation_id,
  a.space_id as first_space_id, b.space_id as second_space_id,
  a.starts_at as first_starts_at, a.ends_at as first_ends_at,
  b.starts_at as second_starts_at, b.ends_at as second_ends_at
from public.reservations a
join public.reservations b on a.user_id = b.user_id and a.id < b.id
  and pg_catalog.tstzrange(a.starts_at,a.ends_at,'[)') && pg_catalog.tstzrange(b.starts_at,b.ends_at,'[)')
where a.status = 'confirmed' and b.status = 'confirmed'
order by a.user_id,a.starts_at,a.id,b.id;
