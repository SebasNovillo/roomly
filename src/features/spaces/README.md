# Spaces

Supabase-backed authenticated catalog and minimal detail pages. `catalog.ts` defines validated records and URL filters; `queries.ts` performs guarded server-only reads; `components/` contains the responsive catalog, filter form, photo fallback, and detail view. Production has no fixture fallback. Isolated UI fixtures live under `tests/`.

See [catalog setup, image sources, and verification](../../../docs/spaces.md). Migration and optional portfolio seed application remain manual. No reservations or availability filtering are implemented.
