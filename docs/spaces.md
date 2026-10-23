# Explore spaces catalog

**2026-10-22 follow-up:** the user reports the space-details migration and Atlas detail update seed are now manually applied, with Atlas's three photos, weekly hours and rules present. Earlier unapplied/pending notes below are historical, not new verification of security policies. The detail page now includes the first database-backed booking flow; see [bookings.md](bookings.md) for its new additive migration, rules, privacy model, checks and pending live verification. Catalog date/time filtering remains out of scope. No previous migration or seed was changed.

Implemented 2026-10-20. Authentication, the existing dashboard layout/sidebar, session-aware Supabase clients, and POST sign-out remain in place. No migration, seed, bucket, or Supabase setting was applied remotely by this task.

**User-reported verification, 2026-10-21:** the catalog migration and portfolio seed were manually applied. Live catalog reads, Atlas search, combined capacity/amenity filtering, and detail/back navigation were manually verified. The amenities summary fix is resolved. These are the user's live results, separate from agent-run mocked/isolated checks. They do not verify the new detail migration, new hours/rules policies, or gallery updates below.

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

## Catalog database setup — already manually applied

The profiles migration `20261014000100_create_profiles.sql` and catalog migration `20261020000100_create_spaces_catalog.sql` are already manually applied, as is `supabase/seeds/spaces_portfolio.sql`, per user reports. **Do not rerun these migrations.** The steps below describe setup for a new environment only. For the existing project, use the additive detail migration/update sequence at the end of this document.

1. Select the intended Supabase project (for example, `roomly-dev`). Review the new migration. In SQL Editor, optionally check for conflicts first:

   ```sql
   select to_regclass('public.spaces'), to_regclass('public.space_images');
   ```

   If either already exists, inspect and reconcile it before proceeding. The migration is deliberately one-time and fails on conflicting tables rather than overwriting them.
2. As database owner in SQL Editor, paste the **complete** `20261020000100_create_spaces_catalog.sql`, including `begin` and `commit`, and run it once. Check that the transaction succeeded. Keep the filename as the migration record. This creates only catalog tables, constraints, indexes, policies, grants, and timestamp triggers. It does not seed data.
3. If you want the fictional portfolio catalog, review and run the **complete separate** `spaces_portfolio.sql` as database owner. It inserts six spaces and one original photo per space. It is repeatable: IDs beginning `a7100000` and `a7200000` are reserved for these fixtures; reapplying updates those records, including any edits to them. It does not delete unrelated records. Slug/image-order conflicts with unrelated records intentionally fail and roll back the seed. Leave this seed unapplied if you want an empty catalog or your own catalog data instead.
4. Keep the existing Data API/public-schema and environment configuration from `authentication.md`. No service-role key or storage bucket is needed. The seed references local application files under `public/images/spaces`; these files must ship with the application. After setup, refresh `/dashboard/spaces` while signed in. If schema-cache errors persist, allow the Data API schema cache to refresh before retrying; do not rerun the migration as a refresh mechanism.
5. In a new environment, verify live reads, filters, detail links, and policies below. The user has already reported catalog read/filter/navigation verification in the existing project; security-policy verification remains separately pending.

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

At the initial catalog implementation, no catalog card properties or original card photos remained missing. Detail-page prose and additional photos had not yet been retrieved; see the 2026-10-21 Atlas follow-up below for newly retrieved content. The original catalog seed uses only the one photo observed per card and authored descriptive summaries. Temporary Figma preview URLs are not stored in application code.

## Checks and pending verification

Automated checks use mocks/fixtures, not live catalog data:

Recorded results on 2026-10-20: ESLint and strict TypeScript passed; 9 Vitest files / 58 tests passed; production build passed with `npm run build -- --webpack`; all 8 production Playwright desktop/mobile tests passed; the isolated catalog UI harness passed. The existing default Turbopack worker issue from the shell task was not addressed. Screenshots of desktop, mobile, and detail layouts were inspected, including the corrected 2:1 card-photo geometry.

- Vitest covers filter parsing/round trips, literal SQL wildcard escaping, unsafe photo URLs, server identity guards, combined query filters, exact counts/pagination, setup versus empty/read errors, and active-slug detail lookup.
- The existing production Playwright suite checks public landing/auth forms and signed-out redirects, including catalog/detail routes, with Supabase variables cleared. It cannot create accounts or send email.
- `node tests/catalog-ui/run.mjs` runs a labeled, isolated actual-component preview using `tests/fixtures/spaces.ts` and test-only Next routing/image/action adapters. It checks all six original photos, 2:1 photo geometry, desktop and 320/390/768px layouts, combined filters, refresh/back/forward, detail/back navigation, sidebar selection, and empty/error/missing/broken-photo states. It starts a local server on port 3131 and shuts it down afterward. Build first with `npm run build -- --webpack`; the harness uses its compiled CSS and the Vite already installed by Vitest. Use your configured `PLAYWRIGHT_BROWSERS_PATH` if browsers are not installed at Playwright's default location. Preview adapters are never imported by production code.

Historical agent check (2026-10-20, before manual setup): the signed-in browser reached the real Supabase-backed page and displayed **Catalog setup needed**. That check established error presentation only. The subsequent successful catalog setup/read/filter/navigation verification was reported by the user on 2026-10-21. Catalog RLS enforcement has not been independently verified by the agent.

After manual setup, verify with authenticated clients (not SQL Editor owner, which bypasses RLS):

1. Active spaces/images can be read; an inactive space cannot be read by list or direct slug and its images are also hidden. An inactive image on an active space is hidden. An active space with no images still renders with a photo fallback.
2. Anonymous SELECT is denied on both tables. Authenticated INSERT/UPDATE/DELETE is denied on both tables, including changes to `is_active`, IDs, and timestamps.
3. Owner edits advance `updated_at`; invalid capacity/type/amenity/slug/image alt/order violates constraints. Seed repeat application updates only its reserved IDs.
4. With the portfolio seed, unfiltered count is six. Minimum capacity 8 plus Display yields Atlas, Horizon, Studio, and Commons. Adding Wi-Fi preserves those four; adding Whiteboard narrows to Atlas and Studio. Search, types, refresh/history, detail/back links, mobile navigation, and sign-out retain expected behavior against actual Supabase.

Reservations, availability/time filtering, production-scale query tuning, and complete Figma source fidelity remain outside this task. No commit, push, or deployment was performed.

## Complete space detail follow-up — 2026-10-21

The detail page now places type, name, floor, and capacity above a large gallery, followed by About this space, amenity icon tiles, and side-by-side opening-hours/rules cards that stack on mobile. It retains the shared authenticated shell, server identity checks, catalog URL filters, active sidebar state, and sign-out action. The reference's availability and Choose your time panels are intentionally omitted: no Available/Booked/Blocked periods, date/time controls, or booking form are rendered.

The gallery reads ordered `space_images`, deduplicates identical URLs, and offers native thumbnail buttons with a visible selected border, `aria-pressed`, main-photo association, and a polite photo counter. Enter/Space activate buttons; Left/Right/Home/End change selection and focus. One image renders once with no manufactured thumbnails; no images or failed image loads render a photo fallback. Photo credits remain plain text. Changing galleries/spaces resets the selected photo.

`getSpace()` continues to load the existing catalog record first, then reads hours and rules independently with the same session-aware client. A missing/unreadable new table does not break the existing catalog/gallery/About information. Failed detail reads show a plain “temporarily unavailable” message for the affected section. Successful empty hours display **Not configured** for each missing day, rather than Closed or a fabricated schedule. Only an explicit closed row displays Closed. Empty rules display that no rules have been published. Content is read from Supabase, with no production fixtures or fallback Atlas schedule.

### Additive migration and update order — prepared, not applied

Previously applied migrations and the existing portfolio seed were left unchanged. For the existing manually configured project:

1. Review `supabase/migrations/20261021000100_create_space_details.sql`. In the intended project's SQL Editor as database owner, run this **new file only**, once, including its complete transaction. It requires the existing catalog tables and private timestamp trigger function. If either new table already exists, inspect/reconcile before applying; do not overwrite it. For an established CLI-managed history, apply through that history instead of SQL Editor after reconciling previously manually applied versions.
2. Optionally review and run the complete, separate `supabase/seeds/space_details_portfolio.sql` as owner. This repeatable update verifies the existing Atlas portfolio ID/slug/demo flag, then updates only Atlas's description, its seven weekly rows, four reserved ordered rule IDs, and two reserved extra photo IDs. It preserves the existing cover photo at order 0 and adds orders 1/2. It does not update the other five spaces or remove unrelated rules/photos. Conflicting image/rule order slots fail the transaction rather than deleting content. Reapplying deliberately restores the observed Atlas values, including any later owner edits to those seeded rows.
3. Refresh the detail page while signed in. No bucket, service-role key, Supabase setting, or Auth change is required. Local gallery assets must ship with the application.

For a new environment, the full order is profiles migration → catalog migration → optional original portfolio seed → detail migration → optional detail update seed. If the original portfolio seed is later reapplied, it restores the earlier authored Atlas description; apply the detail update seed afterward to restore the observed detail copy. Do not rerun either already-applied migration.

`space_opening_hours` has a `(space_id, weekday)` primary key, Sunday=0, explicit closed status, and nullable local opening/closing times. Open rows require both times, minute precision, and start before end; overnight intervals and 24:00 endpoints are not supported in this version. Closed rows require null times; absent rows mean unknown/unconfigured. Times are interpreted in the reference's **America/Chicago** zone, without converting wall-clock times through the viewer's timezone. This is a published weekly schedule, not an availability calculation.

`space_rules` has stable UUIDs, a parent FK, bounded nonblank rule text, unique per-space display order, and timestamps. Both new tables use cascading parent FKs, indexed parent/order keys, timestamp triggers, enabled RLS, explicit revocation of client privileges, and authenticated SELECT only when the parent space is active. No anonymous access or client write grants/policies are added.

### Retrieved Atlas content and assets

Figma source reads still returned `Unknown resource`; its screenshot endpoint still does not support Make files. No new screenshot attachment was exposed in this message. The rendered Make preview was accessible, so the Atlas detail page's visible text, layout, seven-day schedule, four rules, and two additional original image URLs were inspected directly. No source-level style/component match is claimed. Availability/booking content was observed solely to identify and omit those panels.

Observed Atlas description: “A bright, polished meeting room designed for focused team conversations, client presentations, and collaborative working sessions.” Rules, in observed order: respect the 8-person capacity; leave the space tidy and reset furniture; finish on time for the next member; keep noise at a considerate level. The update script preserves their full visible sentences.

Atlas hours: Sunday and Saturday 10:00 AM–4:00 PM; Monday–Thursday 8:00 AM–8:00 PM; Friday 8:00 AM–6:00 PM. These values are **not** assigned to any other space. The other five spaces' extra detail content/photos were not inspected or seeded; their schedules/rules remain unconfigured unless separately entered by the owner.

Additional original gallery assets (1200 × 800 JPEGs, no screenshot crops):

- `public/images/spaces/atlas-meeting-room-2.jpg`: [original Unsplash source](https://images.unsplash.com/photo-1693625700727-b548ca8f5679?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200&h=800).
- `public/images/spaces/atlas-meeting-room-3.jpg`: [original Unsplash source](https://images.unsplash.com/photo-1740933084056-078fac872bff?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200&h=800).

The original Atlas cover photo is reused unchanged. Alt text for new assets is authored from the inspected photos. Photographer names and reusable Figma source styles remain unavailable; additional unseen space details are not represented as extracted content.

### Detail checks and pending live verification

Unit tests mock Supabase. They validate closed/open/unconfigured distinctions, invalid and duplicate weekday rows, local time formatting, guarded parent reads, and graceful independent detail-read failure. The isolated, explicitly labeled UI preview uses fixtures only. It checks the three-photo gallery, selected state, mouse/keyboard controls, desktop/mobile overflow, single/no-image cases, empty/unavailable/closed hours, rules, preserved back-link filters, and absence of booking/availability panels. The existing signed-out production tests cover direct protected detail access. These are not proof of live detail data or database policy enforcement.

Pending after manual application: execute and validate the new migration/update transaction; confirm Atlas's three active images, exact description, seven hours and four rules through the real authenticated app; verify single-image spaces stay single-image and other schedules remain unconfigured; verify inactive-parent detail rows are hidden and anonymous reads/authenticated writes fail for both new tables; verify owner edits advance timestamps and invalid time/rule rows violate constraints. Test role behavior through real authenticated/anonymous clients, not the SQL Editor owner. No remote changes, commit, push, or deployment were performed by the agent.

Agent live browser check (2026-10-21, before applying the new scripts): the authenticated Atlas route loaded the existing database record with its original single photo, original portfolio description, amenities, and filter-preserving back link. No duplicate thumbnail controls appeared. The new hours/rules sections reported temporarily unavailable content without hiding the rest of the page. This does not verify the unapplied detail tables or new seed data.

Recorded automated results: lint, route generation/strict TypeScript, 10 Vitest files / 64 tests, the Webpack production build, and all 8 existing desktop/mobile production Playwright tests passed. The isolated catalog/detail UI harness passed for gallery selection/focus, 1574/390/320px detail layouts, single/no-image states, unknown/closed/unavailable hours, rules and preserved catalog filters. Screenshots were visually inspected. These UI fixtures and mocked Supabase tests do not establish live SQL/RLS behavior. The pre-existing default Turbopack worker issue remains outside this change.
