# Explore spaces catalog

Implemented 2026-10-20. Authentication, the existing dashboard layout/sidebar, session-aware Supabase clients, and POST sign-out remain in place. No migration, seed, bucket, or Supabase setting was applied remotely by this task.

## Application behavior

`/dashboard/spaces` reads active records from `public.spaces`, with ordered images from `public.space_images`. There is no production fixture fallback. The layout, page, and server-only query helper verify identity with the existing `getViewer()` helper. The detail route `/dashboard/spaces/[slug]` reads the same active database record by unique slug. Inactive/missing records produce a not-found page; read failures produce an error state.

Filters are submitted with a GET form and live in the URL:

| Parameter | Meaning |
| --- | --- |
| `q` | Case-insensitive name/description substring, up to 120 characters |
| `minCapacity` | Integer from 1 to 10000; capacity must be at least this value |
| `type` | One of the six catalog type slugs |
| repeated `amenity` | Require **all** selected amenity slugs |
| `page` | Page number, 12 records per page, stable sort by catalog order then ID |

Example: `/dashboard/spaces?minCapacity=8&type=meeting-room&amenity=display&amenity=wi-fi`. Unsupported values are ignored. Detail and back links preserve the normalized filters and page, without accepting arbitrary return URLs. Refresh and browser history use the URL; no localStorage is involved. Apply filters resets pagination. Clear filters returns to the unfiltered first page.

The amenities menu supports Done, Escape, outside-click dismissal, and keyboard controls. Photo failures show an accessible fallback. Loading, setup/read error, no matches, empty catalog, and missing detail states are distinct. Counts come from Supabase's exact filtered count, not the reference or a fixture array. An empty result means no accessible active records; it does not independently establish that RLS is configured correctly.

**Intentional reference differences:** date/start/end controls and per-card availability messages are omitted. This task makes no availability claims and includes no booking controls. An Apply filters button supports explicit GET submission. Optional portfolio seed records are visibly labeled as fictional, with illustrative photos. Existing Roomly logo/system fonts are reused.

## Manual database setup — not executed

The profiles migration `20261014000100_create_profiles.sql` was already manually applied to `roomly-dev`, per the user's earlier report. **Do not rerun it.** This task adds only `supabase/migrations/20261020000100_create_spaces_catalog.sql` and the separate optional seed `supabase/seeds/spaces_portfolio.sql`.

1. Select the intended Supabase project (for example, `roomly-dev`). Review the new migration. In SQL Editor, optionally check for conflicts first:

   ```sql
   select to_regclass('public.spaces'), to_regclass('public.space_images');
   ```

   If either already exists, inspect and reconcile it before proceeding. The migration is deliberately one-time and fails on conflicting tables rather than overwriting them.
2. As database owner in SQL Editor, paste the **complete** `20261020000100_create_spaces_catalog.sql`, including `begin` and `commit`, and run it once. Check that the transaction succeeded. Keep the filename as the migration record. This creates only catalog tables, constraints, indexes, policies, grants, and timestamp triggers. It does not seed data.
3. If you want the fictional portfolio catalog, review and run the **complete separate** `spaces_portfolio.sql` as database owner. It inserts six spaces and one original photo per space. It is repeatable: IDs beginning `a7100000` and `a7200000` are reserved for these fixtures; reapplying updates those records, including any edits to them. It does not delete unrelated records. Slug/image-order conflicts with unrelated records intentionally fail and roll back the seed. Leave this seed unapplied if you want an empty catalog or your own catalog data instead.
4. Keep the existing Data API/public-schema and environment configuration from `authentication.md`. No service-role key or storage bucket is needed. The seed references local application files under `public/images/spaces`; these files must ship with the application. After setup, refresh `/dashboard/spaces` while signed in. If schema-cache errors persist, allow the Data API schema cache to refresh before retrying; do not rerun the migration as a refresh mechanism.
5. Verify the live reads, filters, detail links, and policies below. Until then, populated-catalog behavior is demonstrated by isolated tests only.

If the project already has a managed Supabase CLI migration history, reconcile its existing manually applied versions first and apply the new migration through that established process instead of SQL Editor. Do not use both methods or blindly push the older profiles migration again. SQL Editor execution alone does not populate CLI migration history. Run the optional seed separately after the migration.

## Schema and access

Spaces have stable UUIDs and unique slugs; bounded name/description/floor; a constrained type; positive capacity; constrained amenity slugs; catalog visibility (`is_active`); portfolio labeling (`is_demo`); sort order; and timestamps. `is_active` means published catalog content, not availability. New spaces default to inactive. Images have their own UUID, parent FK with cascading deletion, local/HTTPS URL, required alt text, unique per-space display order, visibility, source credit, and timestamps. Timestamp triggers update `updated_at` on owner edits.

Both tables have RLS enabled. Explicit privileges revoke all client access, then grant only authenticated SELECT. Authenticated users can read active spaces and active images whose parent space is active. There are no anonymous grants or client INSERT/UPDATE/DELETE policies/grants. Owner administration and the optional seed run outside client permissions. Indexes cover active ordering, type/capacity, capacity, amenities (GIN), unique slugs and parent-image order. Substring search is intentionally a scan for this small catalog; no extension was introduced. Review search indexing and exact-count costs if the catalog grows.

## Reference and image provenance

Figma Make source reads returned `Unknown resource`; its screenshot endpoint does not support Make files. The attached catalog screenshot guided visual implementation. The browser preview did load and exposed all six cards, their original image URLs, type/filter options, floors, capacities, amenities, and order. No screenshot crops, replacement stock photos, or generated images are used. The six downloaded JPEGs are 900 × 600, displayed with a 2:1 cover crop in cards and their natural proportions in details. Original reference URLs used `crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900&h=600`.

| Space (floor; capacity; amenities in observed order) | Local filename | Original photo |
| --- | --- | --- |
| Atlas Meeting Room (2; 8; Wi-Fi, Whiteboard, Display) | `atlas-meeting-room.jpg` | [Unsplash](https://images.unsplash.com/photo-1571624436279-b272aff752b5?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900&h=600) |
| Willow Study Room (1; 4; Wi-Fi, Whiteboard, Power outlets) | `willow-study-room.jpg` | [Unsplash](https://images.unsplash.com/photo-1542089363-bba089ffaa25?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900&h=600) |
| Horizon Conference Room (3; 16; Display, Video conferencing, Wi-Fi) | `horizon-conference-room.jpg` | [Unsplash](https://images.unsplash.com/photo-1431540015161-0bf868a2d407?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900&h=600) |
| Focus Office (2; 2; Wi-Fi, Power outlets) | `focus-office.jpg` | [Unsplash](https://images.unsplash.com/photo-1503423571797-2d2bb372094a?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900&h=600) |
| Studio Collaboration Room (1; 10; Whiteboard, Display, Wi-Fi) | `studio-collaboration-room.jpg` | [Unsplash](https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900&h=600) |
| Commons Coworking Area (1; 12; Wi-Fi, Power outlets, Display) | `commons-coworking-area.jpg` | [Unsplash](https://images.unsplash.com/photo-1606836591695-4d58a73eba1e?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900&h=600) |

No catalog properties or original photos remain missing. Figma source styles/components, original detail-page prose, additional photos, and photographer names were not retrieved. The migration supports more images, but the seed uses only the one observed per card. Seed descriptions and expanded alt text are authored from observed properties/photos, not claimed as extracted detail copy. Temporary Figma preview URLs are not stored in application code.

## Checks and pending verification

Automated checks use mocks/fixtures, not live catalog data:

Recorded results on 2026-10-20: ESLint and strict TypeScript passed; 9 Vitest files / 58 tests passed; production build passed with `npm run build -- --webpack`; all 8 production Playwright desktop/mobile tests passed; the isolated catalog UI harness passed. The existing default Turbopack worker issue from the shell task was not addressed. Screenshots of desktop, mobile, and detail layouts were inspected, including the corrected 2:1 card-photo geometry.

- Vitest covers filter parsing/round trips, literal SQL wildcard escaping, unsafe photo URLs, server identity guards, combined query filters, exact counts/pagination, setup versus empty/read errors, and active-slug detail lookup.
- The existing production Playwright suite checks public landing/auth forms and signed-out redirects, including catalog/detail routes, with Supabase variables cleared. It cannot create accounts or send email.
- `node tests/catalog-ui/run.mjs` runs a labeled, isolated actual-component preview using `tests/fixtures/spaces.ts` and test-only Next routing/image/action adapters. It checks all six original photos, 2:1 photo geometry, desktop and 320/390/768px layouts, combined filters, refresh/back/forward, detail/back navigation, sidebar selection, and empty/error/missing/broken-photo states. It starts a local server on port 3131 and shuts it down afterward. Build first with `npm run build -- --webpack`; the harness uses its compiled CSS and the Vite already installed by Vitest. Use your configured `PLAYWRIGHT_BROWSERS_PATH` if browsers are not installed at Playwright's default location. Preview adapters are never imported by production code.

The existing signed-in browser session reached the real Supabase-backed page and displayed **Catalog setup needed**. This verifies the guarded setup-error presentation, not a populated catalog or the new SQL. No live migration/seed execution, active-row reads, filters, or catalog RLS enforcement is claimed.

After manual setup, verify with authenticated clients (not SQL Editor owner, which bypasses RLS):

1. Active spaces/images can be read; an inactive space cannot be read by list or direct slug and its images are also hidden. An inactive image on an active space is hidden. An active space with no images still renders with a photo fallback.
2. Anonymous SELECT is denied on both tables. Authenticated INSERT/UPDATE/DELETE is denied on both tables, including changes to `is_active`, IDs, and timestamps.
3. Owner edits advance `updated_at`; invalid capacity/type/amenity/slug/image alt/order violates constraints. Seed repeat application updates only its reserved IDs.
4. With the portfolio seed, unfiltered count is six. Minimum capacity 8 plus Display yields Atlas, Horizon, Studio, and Commons. Adding Wi-Fi preserves those four; adding Whiteboard narrows to Atlas and Studio. Search, types, refresh/history, detail/back links, mobile navigation, and sign-out retain expected behavior against actual Supabase.

Reservations, availability/time filtering, production-scale query tuning, and complete Figma source fidelity remain outside this task. No commit, push, or deployment was performed.
