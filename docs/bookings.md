# Booking flow

**User-reported manual verification, 2026-10-27:** cancellation moved a reservation to Cancelled, released its occupied interval, and allowed that interval to be reserved again. This is the user's hosted cancellation result, separate from agent-run local/mocked tests. It does not verify the new cross-space user-schedule rule below.

Extended 2026-10-26 with My bookings and owner-only cancellation. The sections about the initial 2026-10-22 implementation and its verification remain historical; the new migration and checks are documented below. No hosted reservation was created or cancelled by this task, and no remote migration/settings change was made.

Implemented 2026-10-22. Database SQL is prepared locally only. The agent has not applied a remote migration, created a real booking/account, sent email, or changed Supabase settings. No service-role key is used.

## Existing setup and migration order

**User-reported verification (2026-10-22):** profiles, catalog, and space-details migrations and both portfolio seed scripts were manually applied. Atlas has three photos, weekly hours and rules. Previous live catalog/search/filter/detail navigation checks were user-reported. These reports do not verify the new reservation migration or live booking flow.

Previously applied files remain unchanged:

1. `20261014000100_create_profiles.sql`
2. `20261020000100_create_spaces_catalog.sql`
3. `20261021000100_create_space_details.sql`

For the existing project, review and manually apply **only** `supabase/migrations/20261022000100_create_reservations.sql`, once, as database owner in the intended project's SQL Editor, including its entire `begin`/`commit` transaction. Check transaction success before using the flow. It installs `btree_gist` if absent and adds reservations, blocked periods, policies, grants and functions. It requires the existing spaces/hours tables and private timestamp function. It deliberately fails on existing conflicting objects rather than replacing them. If migration history is managed with the CLI, reconcile the already-manually-applied versions before using that history; do not blindly push all migrations.

No new booking seed is provided: the production flow starts with no reservations or blocks. Existing Atlas schedule/gallery seeds are sufficient. Other spaces remain unbookable for unconfigured weekdays. Do not copy Atlas's schedule to them. No bucket, Auth setting, or environment variable change is required. If the Data API temporarily reports a missing RPC after successful application, allow schema-cache propagation; do not rerun the migration as a cache refresh.

## Pages and behavior

- `/dashboard/spaces/[slug]`: preserves the existing gallery, description, amenities, schedule and rules. Adds a desktop-sticky Choose your time panel, responsive mobile placement, native accessible date input, 30-minute start/end selects and daily availability. Date/selection query parameters are `date`, `start`, `end`; catalog query parameters remain intact. Selection edits replace the current detail URL; refresh and browser history reconstruct it.
- `/dashboard/spaces/[slug]/availability?date=YYYY-MM-DD`: protected, private/no-store endpoint. Resolves an active database space, then calls the authenticated `booking_day` function. It never exposes reservation IDs, references, user IDs, titles or other user details.
- `/dashboard/spaces/[slug]/review`: renders the real active space and the selection, actual elapsed duration and timezone. Rechecks availability. Change date or time returns the same selection and catalog filters. A stable UUID `request` parameter survives reloads; a review URL without one is redirected to include a generated key. An owner-scoped database read can recover a previously committed request after a lost response.
- Confirm booking uses a server action with independent verified-session authentication and an authenticated database RPC. No submitted user ID is accepted. Buttons show pending state and resist double clicks; database idempotency is authoritative. Conflict/service errors stay on review and preserve the change link. Only a successful UUID result from the database redirects to confirmation.
- `/dashboard/reservations/[id]`: reads through session-aware RLS; a missing/other-owner UUID renders Booking not found. Service errors never render success. A confirmed row shows its UUID reference, space/date/time/duration/timezone, View space and Explore more spaces. A cancelled row explicitly shows cancellation. If the space becomes inactive/unreadable, the owner can still see their reservation times/reference without leaking inactive catalog content.

Availability refreshes on date changes and every 30 seconds, with abort/stale-response handling. A server-clock-based timer advances the past/current boundary. Results distinguish service/setup failure, unconfigured hours, explicitly closed days and DST boundary ambiguity; none is represented as a free day. Available/Booked/Blocked/Past segments are computed from current database ranges, never from the reference screenshots. Configured occupied ranges are merged for display and clipped to the chosen local day by SQL. Past segments are labeled past. These are informational, not a held booking; confirmation is authoritative.

## Booking and time rules

- All displayed selection dates/times use **America/Chicago**. Instants are stored as `timestamptz`.
- Start/end must be on the same local date in 30-minute increments; actual elapsed duration is at least 30 minutes. End must follow start. Start must be strictly after database `clock_timestamp()` at confirmation.
- The entire interval must fit within that weekday's explicit open row. Missing rows are unconfigured; explicit closed rows are closed. Existing schedules support one same-day interval, no overnight/24:00 endpoints. No maximum advance-booking horizon is imposed beyond supported calendar input.
- IANA timezone rules are used in JavaScript and PostgreSQL, without a fixed UTC offset or dependence on the viewer/host timezone. Nonexistent spring-forward wall times and repeated fall-back wall times are **rejected** with guidance to choose another time. This first version does not offer a first/second occurrence selector. Valid intervals crossing a transition use actual elapsed time for duration. Ambiguous/nonexistent opening-hour boundaries make that date unbookable until clarified.
- Intervals are half-open `[start,end)`: adjacent reservations/blocks are allowed. Only `confirmed` reservations occupy time; `cancelled` rows retain history and release it. The 2026-10-26 extension below adds cancellation UI/API.

## Atomic authorization and conflict protection

`reservations` associates space, authenticated owner, start/end instants, `confirmed`/`cancelled` status, a UUID idempotency request, and timestamps. The confirmed-only GiST exclusion constraint rejects overlapping space/time ranges, including concurrent writes. `(user_id, request_id)` is unique. The owner is taken from `auth.uid()` inside `create_booking`, never from a function parameter or form.

`create_booking` acquires a transaction advisory lock on owner+request, returns the existing confirmed row for an identical retry, rejects key reuse with a different selection, and serializes each new confirmation with a parent-space row lock. It reads/locks opening hours, rechecks active status, future time, minimum/step/DST/hours rules, and configured blocks before inserting. The exclusion constraint remains the final concurrent reservation guard. No write grant is given to anonymous or authenticated clients.

`space_blocked_periods` stores only explicitly configured absolute blocked ranges. There are no seeded blocks and no block-management UI. A trigger obtains the same parent-space lock and rejects overlaps with confirmed reservations, including a concurrent booking/block race. A database owner can configure an intentional block with explicit instants; anonymous/authenticated clients cannot insert/update/delete or read block records. Block changes and future cancellation/reactivation functions must retain this lock order and conflict protection; privileged operators should use the supported booking function rather than bypassing its business validation with direct reservation inserts.

Reservations enable RLS with owner-only SELECT, including cancelled rows. Only the required columns (including the owner's own request key for lost-response recovery) have SELECT grants; `user_id` is not exposed. There are no client write policies/grants. Both public RPCs are SECURITY DEFINER with `search_path = ''`, qualified application objects, explicit `auth.uid()` checks, revoked PUBLIC/anon execution, and authenticated execution only. Private helper functions have no client execution privileges. Availability returns only state, current server time, opening bounds and clipped `{start,end,kind}` occupied ranges for active spaces.

Design references for database behavior: PostgreSQL's [range exclusion constraints](https://www.postgresql.org/docs/17/rangetypes.html#RANGETYPES-CONSTRAINT) and [handling of invalid/ambiguous timestamps](https://www.postgresql.org/docs/17/datetime-invalid-input.html). The implementation deliberately rejects ambiguous wall times rather than accepting PostgreSQL's implicit choice.

## Reference and asset limitations

Figma Make context returned source links without usable source; its session/screenshot endpoints reported Make as unsupported and a resource read failed. The four attached screenshots guided the time panel, two-column proportions, controls and color-coded daily ranges. Existing Roomly components/tokens/gallery/photo assets are reused. No additional photos, unavailable review/confirmation designs, or unseen reference copy are claimed as extracted. Review and confirmation compose the existing Roomly styles. The browser's native calendar replaces the reference's custom calendar popover; its visual appearance/date order follows browser locale, while selected values always mean Chicago calendar dates. Booking data is real database content after the new migration is manually applied.

My bookings and cancellation were initially excluded and are now implemented by the 2026-10-26 extension below. Dashboard booking summaries, catalog date/time filters, notifications and email remain outside scope. Portfolio spaces remain fictional; reservation and cancellation writes are real database writes after setup.

## Local checks and manual verification

Agent checks are separate from the user's live reports:

- Unit tests mock Supabase: selection/date/DST rules, range segmentation, filter/selection links, authentication guards, malformed/setup/service reads, action validation, safe errors, database-success-only redirects and stable retry keys.
- `node tests/database/bookings.mjs` uses installed PostgreSQL 17 binaries to create a **new disposable cluster**, bound only to `127.0.0.1:55482`, under an ignored `.tools/booking-db-<uuid>` directory. It ignores ambient PG connection configuration and never reads `.env` or connects to Supabase. A minimal local `auth.users`/`auth.uid()` stub and two fake UUID identities exercise SQL authorization without real accounts/emails. All migrations are executed against the empty cluster. Tests exercise actual grants/RLS, valid/minimum/past/step/duration/hours/closed/unconfigured/DST cases, overlaps, adjacent intervals, blocks, concurrent overlapping confirmations, concurrent identical retries, concurrent booking/block races, request-key mismatch, cancelled status, inactive spaces, minimal range fields and owner-only reads. The cluster is stopped in `finally`; ignored logs/data remain for inspection. This verifies PostgreSQL behavior, not hosted Supabase's JWT/Data API configuration. Requires owner-capable local `initdb`, `pg_ctl`, `psql` and `btree_gist`; set `ROOMLY_TEST_PG_BIN` to the binaries directory if different. No remote database URL is accepted.
- `node tests/catalog-ui/run.mjs` uses actual UI components with explicitly labeled isolated fixtures and mocked availability/confirmation adapters, no Supabase connection. It covers desktop/mobile (1574/1056/390/320 widths), sticky/responsive layout, occupied ranges, gallery/catalog regression checks, review/back/filter preservation, selection validation, unconfigured/closed/service/pending/conflict states and fixture confirmation. The apparent booking/reference in these screenshots is a test fixture, not a live reservation.
- Existing production Playwright auth/landing tests are retained, with protected review, availability and confirmation URLs added. They use cleared Supabase environment configuration and never submit valid registration or create bookings.

Pending **manual** live verification after applying the new migration: verify a configured Atlas date through the authenticated Data API; verify another unconfigured space remains unbookable; intentionally create a future reservation only when authorized; confirm owner reference and review reload recovery; test a second authorized account cannot view the first confirmation, and anonymous requests fail; test concurrent overlap/adjacency and idempotency through real sessions; configure any required block deliberately as owner and confirm only its ranges appear. Check real hosted grants/RLS and JWT identity handling. Do not treat local fixtures/stub identities as that verification.

Build note: the installed Next.js 16.4.0 build reported a dependency security advisory and initially stopped after compilation. A retry completed with the advisory still present. Dependencies were left unchanged to preserve this task's scope; a security upgrade remains recommended and unverified here. The existing default Turbopack issue is also unchanged; verification uses `npm run build -- --webpack`.

Recorded agent results (2026-10-22): lint and strict TypeScript passed; 14 Vitest files / 97 tests passed; Webpack production build passed on retry with the security advisory above; all 8 existing desktop/mobile production Playwright tests passed, including the newly listed protected booking URLs. The disposable PostgreSQL 17 suite passed, including the concurrent booking/block test. The isolated catalog/booking browser suite passed, including sticky scrolling, sidebar collapse, desktop/mobile layouts, review/change/filter preservation, and fixture confirmation/error states. Desktop detail and mobile detail/review/confirmation screenshots were visually inspected. Earlier migrations and seed files have no diff. These results do not constitute hosted Supabase booking verification.

## My bookings and cancellation — 2026-10-26

### Exact manual migration step

New file: **`supabase/migrations/20261026000100_add_booking_cancellation.sql`**. It is prepared locally and has not been applied to hosted Supabase by the agent.

The full migration order is profiles (`20261014000100`) → catalog (`20261020000100`) → space details (`20261021000100`) → reservations (`20261022000100`) → this cancellation/list migration (`20261026000100`). Previously applied files and portfolio seeds were left unchanged. This request did not independently establish which reservation migrations are currently applied in the hosted project; the earlier reports above cover profiles/catalog/details.

1. In the intended Supabase project's SQL Editor as database owner, inspect the current schema without modifying it:

   ```sql
   select to_regclass('public.reservations');
   select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'reservations'
     and column_name = 'cancelled_at';
   select to_regprocedure('public.cancel_booking(uuid)'),
          to_regprocedure('public.my_bookings(text,integer)');
   ```

2. Confirm the existing reservations migration and its dependencies have already been applied successfully. **Do not rerun them.** If the reservation table/functions are absent, complete the initial booking setup above first, applying only genuinely missing migration versions in order. If cancellation/list objects already exist, inspect migration history and reconcile rather than rerunning or overwriting them.
3. Review and run the **complete new cancellation migration**, including its `begin` and `commit`, once. This adds `cancelled_at`, supporting indexes, an owner cancellation RPC, and a bounded list RPC. Confirm the transaction succeeds. CLI-managed projects should reconcile manual migration history before using that workflow rather than blindly pushing all migrations.
4. Refresh `/dashboard/bookings` while signed in. Allow Data API schema-cache propagation if necessary. No new seed, account, bucket, service-role key, or Auth setting is required. Do not create demonstration reservations. Existing owned records, including an October 23 reservation if it exists, are read naturally; no production dates, references, identities, or booking arrays are hardcoded.

### Data, categories and bounded queries

`my_bookings(p_tab,p_page)` is a restricted **SECURITY INVOKER** function, retaining the existing owner-only reservation RLS and active catalog/image RLS. PUBLIC/anon execution is revoked; only authenticated execution is granted. It explicitly checks authentication, uses an empty search path and fully qualified application objects, and selects only granted reservation columns. It does not select or require client access to `user_id`. Only SELECT on the new `cancelled_at` column is added; no general UPDATE/DELETE grants or policies are introduced.

One PostgreSQL statement snapshot and `statement_timestamp()` boundary supplies all three full counts and the selected page. Categories are mutually exclusive:

- Upcoming: confirmed and `ends_at > boundary`, including ongoing reservations.
- Past: confirmed and `ends_at <= boundary` (the exact end instant is past).
- Cancelled: cancelled, regardless of scheduled date.

Upcoming sorts by start ascending; Past by start descending; Cancelled by `cancelled_at` descending, nulls last, with deterministic start/UUID ties. The migration does **not** invent cancellation timestamps for legacy cancelled rows; those remain NULL and sort after known cancellation times. The RPC returns at most 12 cards; counts reflect every matching owned record, not the current page. Invalid pages are rejected by SQL; out-of-range valid pages clamp to the last page. `tab` and `page` live in the URL and work with refresh/back/forward.

Only metadata for active, readable spaces and images is joined. A reservation whose space is inactive/unreadable remains visible with its real dates, duration, UUID reference and status, plus a neutral photo/details fallback. No inaccessible name/floor/photo is reconstructed from fixtures. Cancellation remains possible for an eligible owned reservation even if its space is inactive.

The UI reuses the shell, sidebar, photo component and scoped tokens. Cards display Chicago date/time (including CST/CDT), actual elapsed duration, the existing uppercase UUID reference and a truthful status. Ongoing rows show In progress and no cancellation action. Tab counts share the RPC boundary; the list refreshes on focus and periodically, with earlier refresh at visible start/end boundaries. A loaded snapshot can become stale while a request is in flight; database time and eligibility checks remain authoritative.

The owner-only reservation detail page now says Past booking or This booking was cancelled when applicable, and In progress during its reserved interval. Only a future confirmed booking uses the existing confirmation heading. Display uses the saved instants and actual elapsed duration, avoiding reinterpreting stored times across DST transitions. Back to my bookings selects the appropriate category. Private/missing reservation URLs still produce not found rather than another user's data.

### Cancellation transaction and UI

`cancel_booking(p_reservation_id)` is a narrowly scoped SECURITY DEFINER function with an empty search path, qualified objects, explicit `auth.uid()` check and authenticated-only execution. It discovers an **owned** row without locking it, then acquires the same owner/request advisory lock as `create_booking`, the parent-space row lock used by booking/block writes, and finally the owned reservation row lock. This order avoids locking a reservation before the space. Ownership/status/timing are rechecked after locks. Only confirmed reservations with `starts_at > clock_timestamp()` can transition to cancelled. No caller-supplied user ID is accepted.

A successful transition records the real `cancelled_at`, retains the UUID, request key, space, original instants and creation timestamp, and advances the existing update timestamp trigger. Repeated/concurrent cancellations return the same ID without changing the cancellation timestamp; an already-cancelled legacy row also stays unchanged. Missing and other-owner IDs produce the same not-found error. Past/ongoing confirmed rows are rejected. There is no delete, reactivation or client UPDATE path. A retry of the original creation request cannot reactivate a cancelled reservation.

The existing confirmed-only exclusion constraint and `booking_day` query automatically stop occupying the cancelled interval. This releases that reservation's claim; it **does not guarantee availability** under current opening hours, blocks, or other constraints. The dialog copy reflects that distinction.

The native modal dialog has a named heading/description, inert background, keyboard focus containment and initial focus on Keep booking. Keep and Escape close without mutation and restore focus to the trigger. While pending, both buttons are disabled and Escape dismissal is prevented. Failures keep the dialog and real list state intact with an actionable error. The server action independently verifies the session, checks the exact database-confirmed UUID result, revalidates My bookings, the reservation route and space routes, then redirects to Cancelled. The success banner appears only after an owner-scoped read confirms the referenced row is cancelled; a forged query parameter alone is insufficient. Space availability reads remain uncached and refresh on date/focus changes and the existing 30-second poll.

### Reference and verification limits

The Make context returned source links; session and screenshot tools reported Make unsupported. The interactive browser preview **was accessible** and its My bookings, Upcoming/Past/Cancelled tabs and empty states were inspected. Its current demonstration list was empty, so no prototype booking was created to manufacture content. The six supplied images (including a duplicate Cancelled empty-state image) guided populated horizontal cards, status pills, dialog and success banner. Existing local room photos are reused from database image records. No prototype references, counts, demo identity, booking data or unseen source styles are represented as extracted production data. The existing UUID reference is longer than the prototype reference and wraps responsively. Dialog copy intentionally avoids a promise of guaranteed availability.

The expanded local PostgreSQL harness executes every migration in a new disposable local cluster with fake auth-schema identities, not real accounts. New assertions exercise owner isolation and grants, full counts over multiple pages, category boundaries including ongoing rows, sorting, legacy unknown timestamps, inactive metadata, past/ongoing refusal, repeated/concurrent cancellation, preserved history/request keys, availability release/rebooking, rejection of reactivation/direct writes, and a cancellation/creation race. This is real PostgreSQL verification, but not hosted Supabase JWT/Data API verification.

Unit tests mock Supabase for list/setup/service failures, session guards, exact result validation, safe errors and revalidation/redirect behavior; view tests cover temporal boundaries, truthful detail headings, and preventing a spoofed success banner. The explicitly labeled local UI harness uses an isolated in-memory cancellation endpoint under `tests/` only; it is not an application route, account, remote write, localStorage fallback or authentication bypass. It checks real components across desktop/mobile widths, full tab counts, history navigation, empty/error/missing-space states, pagination, ongoing eligibility, dialog focus trap/Keep/Escape/restoration, pending lockout, failure without success, and fixture-only cancellation persistence.

### Pending hosted verification — manual, not performed by the agent

After applying only the missing new migration in the intended project:

1. Sign in with an existing account and check the real tabs and full counts against its known records. A confirmed reservation that ended on October 23 should be Past on October 26; do not insert it if absent or expose it if owned by someone else. Check refresh, back/forward, pagination and Chicago dates/times.
2. Open an owned past/cancelled/ongoing reservation and confirm truthful detail headings. Ongoing remains Upcoming with no Cancel action. Verify other-owner and unknown detail UUIDs both fail to reveal data.
3. When intentionally authorized to mutate a suitable future test reservation, open its dialog: Keep and Escape must leave the record unchanged. Confirm cancellation once; verify the persisted status/timestamp, unchanged UUID/request/instants, refreshed counts, selected Cancelled tab and verified banner. Retry safely and confirm the timestamp does not move. Do not cancel a real member's reservation merely to test this feature.
4. Inspect the affected day through the authenticated space page. The cancelled row must disappear from occupied ranges; assess any independently configured blocks/hours before calling the slot available. Refresh or refocus any already-open space tab. Rebooking is a separate real write and requires deliberate authorization.
5. Using real authenticated sessions (not SQL Editor owner bypass), verify a second account cannot read or cancel the first account's reservation, anonymous RPC access is denied, and authenticated direct UPDATE/DELETE/reactivation is denied. Verify past/ongoing cancellation refusal even if a request is manually submitted, and concurrent/repeated cancellations remain safe. Never copy/log session tokens or keys while doing these checks.

Hosted migration application, list reads, cancellation, RLS/JWT enforcement and availability release are still pending. No hosted writes, settings changes, commit, push or deployment were performed. Dashboard booking summaries remain outside scope.

Recorded agent results (2026-10-26): lint and explicit route-generation/TypeScript checks passed; 16 Vitest files / 117 tests passed; the final Webpack production build passed on retry after the existing Next.js 16.4.0 security-advisory interruption. Dependencies were not changed; the security upgrade recommendation remains pending. All 8 existing desktop/mobile production authentication/landing tests passed. The expanded disposable PostgreSQL suite passed, including concurrent cancellation/creation and repeated cancellations. The complete isolated catalog/booking/My bookings browser suite passed at 1574/1056/768/390/320px My bookings widths, including keyboard focus containment/restoration, pending dismissal prevention, errors, truthful details, and test-only cancellation persistence. Desktop/mobile cards and dialogs were visually inspected; fixture previews are saved under ignored `.tools/my-bookings-preview/`. Previously applied migrations, seeds, authentication clients, dashboard summaries and dependencies have no implementation diff. None of these checks establishes hosted Supabase verification.

## One confirmed reservation at a time per user — 2026-10-27

New migration: **`supabase/migrations/20261027000100_prevent_user_booking_overlaps.sql`**. It follows `20261026000100_add_booking_cancellation.sql`; all earlier migration files are unchanged. No remote SQL or real reservation mutation was performed by the agent.

### Read-only preflight and manual application

1. Confirm the existing profiles → catalog → space details → reservations → cancellation migrations have already been applied in the intended project. Do not rerun previously applied files. Run **`supabase/preflight/20261027000100_user_reservation_overlaps.sql`** in that project's SQL Editor as database owner. This is an administrator-only read: authenticated clients intentionally cannot SELECT `user_id`, and RLS would not give a cross-user audit. Keep the returned private reservation identifiers within the administrative review.

   The preflight query is:

   ```sql
   select a.user_id,
     a.id as first_reservation_id, b.id as second_reservation_id,
     a.space_id as first_space_id, b.space_id as second_space_id,
     a.starts_at as first_starts_at, a.ends_at as first_ends_at,
     b.starts_at as second_starts_at, b.ends_at as second_ends_at
   from public.reservations a
   join public.reservations b on a.user_id = b.user_id and a.id < b.id
     and pg_catalog.tstzrange(a.starts_at,a.ends_at,'[)')
       && pg_catalog.tstzrange(b.starts_at,b.ends_at,'[)')
   where a.status = 'confirmed' and b.status = 'confirmed'
   order by a.user_id,a.starts_at,a.id,b.id;
   ```

2. Any returned pair is an existing conflict, including past reservations still marked confirmed. Review it manually before applying the migration. **Nothing is deleted, cancelled, rescheduled, or relabeled automatically.** Adjacent intervals and cancelled rows do not appear as conflicts. An empty preflight result is only a snapshot, not an installation guarantee.
3. When preflight is clean, review and run the complete new migration once, including `begin` and `commit`. It takes an ACCESS EXCLUSIVE reservation-table lock while checking and building the constraint, so use an appropriate maintenance window for booking writes. It repeats the conflict check under that lock, preventing writes from entering between preflight and installation. If conflicts exist, it fails with SQLSTATE `23514` and the clear message “Existing confirmed reservations overlap for a user; migration was not applied”. The transaction preserves all reservations and the prior RPC. Review the separate preflight results; do not rerun old migrations or delete history to force installation. Already-installed objects should be reconciled against migration history rather than overwritten.
4. Confirm transaction success. A read-only owner inspection can verify both exclusion constraints:

   ```sql
   select conname, pg_get_constraintdef(oid)
   from pg_constraint
   where conrelid = 'public.reservations'::regclass
     and conname in ('reservations_no_overlap', 'reservations_user_no_overlap');
   ```

   CLI-managed projects should reconcile manually applied history before their usual migration workflow; do not blindly push earlier versions. No seed, bucket, service-role key or Supabase setting change is needed.

### Constraint, RPC and locking

`reservations_user_no_overlap` is a partial GiST exclusion constraint on `(user_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE status = 'confirmed'`. It uses the existing `btree_gist` installation. It rejects a user's overlaps across every space, including concurrent/direct writes. The original space exclusion constraint stays in place. Half-open ranges allow both preceding and following adjacent reservations; cancelled records do not occupy either exclusion constraint.

The new migration replaces only the `create_booking` function body using the same signature, verified-session identity, SECURITY DEFINER mode, empty search path, qualified objects and authenticated-only execution grant. Request-key locking and replay checks run exactly as before. Identical confirmed retries still return the original UUID; cancelled/mismatched request-key reuse still fails. New insert attempts additionally acquire a per-owner advisory lock (a separate two-integer lock namespace) **after replay checking and before any space lock**. This serializes the owner's new RPC inserts across spaces and avoids cross-space exclusion-index races/deadlocks through this function. The database constraint remains authoritative for all writes, independent of the RPC lock.

The existing request → space ordering is preserved; cancellation keeps its request → space → reservation lock order and does not acquire the new owner lock. Existing space-active, Chicago/DST, future start, duration/30-minute step, weekly hours and explicit block validations are unchanged. `cancel_booking`, `booking_day`, `my_bookings`, table grants and RLS policies are not replaced or broadened. Cancellation removes the record from both confirmed-only constraints, preserving its UUID/history/request behavior.

An exclusion failure is inspected with PostgreSQL `GET STACKED DIAGNOSTICS ... CONSTRAINT_NAME`. Only `reservations_user_no_overlap` becomes safe custom SQLSTATE **`PBR01`**, message `User schedule conflict`, without constraint details, IDs, times or other-user metadata. Existing space/block failures remain `23P01`; all other failures retain their prior behavior. If both constraints would conflict, the reported constraint determines the error category; cross-space personal conflicts have their own unambiguous code. The application uses that code, never provider message/detail parsing.

### Application behavior and verification

No personal-schedule precheck or new data-read endpoint is added. Shared room availability still reflects only that room's opening hours, confirmed reservations and blocks. A room can correctly show available while this user has another room reserved. The selection and review copy make this distinction clear. Database confirmation checks the rule even if the review loaded before the conflicting reservation was committed.

`PBR01` displays exactly: **“You already have a booking during this time. Choose another time or manage your existing booking.”** The error includes a My bookings link to the Upcoming tab. Review selection, request key, catalog filters and Change date or time link remain intact; no success redirect occurs after a conflict. Space conflicts keep their existing message. No other users' booking details are queried or shown. Dashboard integration remains outside scope.

Agent verification uses the existing disposable local PostgreSQL cluster, fake auth-schema identities and isolated UI fixtures, never real accounts or hosted bookings. Added SQL tests exercise legacy preflight detection and rollback without data/RPC changes, clean installation, cross-space overlap shapes, both adjacencies, cancelled rows, distinct users booking distinct rooms simultaneously, the original space constraint, shared-room availability during a personal conflict, owner isolation, privileged direct constraint enforcement, concurrent cross-space attempts, same-request retries and cancellation/creation races. Existing opening-hours, blocked-period, duration, DST and cancellation checks remain in the suite. Application tests mock the dedicated code versus space/service errors and verify a conflict after review load, the exact message, My bookings link, retained filters/selections and responsive error display.

Remaining manual steps after applying this new migration: with deliberately authorized test reservations and real authenticated sessions, verify same-user cross-space rejection (including a review left open before another confirmation), adjacent success, cancelled-interval reuse, different-user/different-room success, same-room rejection, same-request replay, owner-only reads and unchanged room availability. These are pending hosted checks; the user's cancellation verification at the top is a separate result. Do not create/cancel real reservations automatically to perform them.

Recorded agent results (2026-10-27): lint, explicit TypeScript/route generation and all 119 unit tests passed. The expanded disposable PostgreSQL suite passed, including preflight failure/rollback, direct-write constraint enforcement and concurrency outside the RPC, concurrent independent users, cross-space RPC races, cancellation races, retries and all existing duration/hours/DST/block checks. The complete isolated catalog/booking/My bookings browser suite passed; the post-review personal-conflict message/link and retained selection/filters were verified, and its mobile screenshot was inspected and saved under ignored `.tools/user-schedule-preview/`. All 8 existing production desktop/mobile authentication/landing tests passed. The Webpack production build passed on retry after the existing Next.js dependency security-advisory interruption; dependencies were unchanged and the upgrade recommendation remains pending. Earlier migration files, cancellation/availability RPC definitions, RLS policies and Dashboard implementation were left unchanged. These checks used local fake identities or mocks, not hosted Supabase reservations.
