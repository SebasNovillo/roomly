# Authenticated Dashboard

## Booking integration — 2026-10-28

`/dashboard` now reads the verified member's real bookings. The actual profile display name and current America/Chicago date retain the existing `getViewer()` and `ChicagoDate` behavior. The public landing page, responsive/collapsible sidebar, sign-out, catalog, booking protections and personal-conflict check are preserved.

Desktop uses a main column for the featured booking and Upcoming plans, with Quick actions and Booking overview in the right column. Tablet/mobile layouts stack the booking column; the two secondary cards stack on narrow screens. Existing Roomly tokens, rounded cards, Lucide icons, `SpacePhoto`, original database image records and booking badges are reused. Long UUID references wrap; they are the existing uppercase reservation UUID convention, not prototype references.

### Data and categories

The server calls the existing `getMyBookings('upcoming', 1)` once. The `my_bookings` SECURITY INVOKER RPC returns at most 12 cards and **full-history** Upcoming/Past/Cancelled counts in one SQL snapshot using its `statement_timestamp()` boundary. Dashboard renders only the first four eligible distinct cards: one featured reservation and up to three additional plans. It does not fetch the whole history or issue per-card queries. The same RPC `now` governs classification and status labels for every displayed entry and total.

- Upcoming: confirmed and `ends_at > now`, including ongoing reservations.
- Past: confirmed and `ends_at <= now`.
- Cancelled: cancelled regardless of scheduled date.
- Featured: earliest Upcoming start time, with UUID tie ordering. An ongoing reservation says **Your current booking / In progress**; a future one says **Your next booking / Confirmed**.
- Upcoming plans exclude the featured UUID and show at most three more in ascending start order. One booking shows “You’re all set. No additional upcoming bookings.” None shows “No upcoming bookings yet.”

The existing RPC supplies readable active-space name, floor, slug and first active photo. One additional bounded active-catalog SELECT (`id,type`, for at most four readable space IDs) supplies space types, which the existing RPC does not include. Missing/inactive space metadata remains generic and does not produce a View space link; owned dates, actual elapsed duration, UUID and owner-only View booking details remain usable. An unavailable type is labeled unavailable rather than inferred from a slug or fixture. Metadata lookup failure does not erase successfully read owned bookings/totals.

Every read uses verified authentication and the existing request-scoped publishable-key Supabase client under owner-only reservation RLS and active-catalog RLS. `user_id` is not selected or submitted. No service-role key, production fixture array, localStorage for bookings, globally cached server client, cross-request data cache or new RPC is used. The existing force-dynamic Dashboard layout and session cookies keep server reads request-specific. Dashboard holds booking data only in incoming server props, not persistent client storage. The server keys the Dashboard by the verified Auth identity (now included in the viewer helper's existing return value, without changing its authentication/profile checks). A client-only observer uses the existing browser Supabase client to hide the previous name, entries and totals immediately on sign-out or a different identity event and refresh the protected server page. It unsubscribes on unmount; it cannot authorize reads or grant access. Sign-in/out retain the existing cookie-changing server actions. Browser auth events are mocked in local fixtures; hosted cross-tab/account-switch verification remains manual.

### Navigation, errors and freshness

- Featured View booking details and each plan link open `/dashboard/reservations/[id]`, retaining its owner-only checks.
- Readable View space opens the actual `/dashboard/spaces/[slug]`.
- View all bookings opens `/dashboard/bookings?tab=upcoming`.
- Find a space opens `/dashboard/spaces`; Manage bookings opens `/dashboard/bookings`.
- Overview categories link to `/dashboard/bookings?tab=upcoming`, `past`, and `cancelled`.

Dates/times use the existing Chicago/IANA formatters, with CST/CDT shown on booking times. Duration uses saved instants, preserving elapsed time across DST. `ChicagoDate` updates the displayed current date while open.

`loading.tsx` displays an explicit loading state with unavailable totals and usable Quick actions. A failed booking read shows a retry card and unavailable totals; it never resembles zero bookings or an empty history. Empty states only follow successful reads. Inconsistent RPC counts/entries also fail clearly. The real profile name appears once the authenticated page resolves; loading shows a generic Dashboard heading without a fabricated identity.

Dashboard reuses the project's timeout/focus refresh pattern: refresh on window refocus, at the earliest visible future booking start/end boundary (+100 ms), or after 60 seconds, whichever comes first. There is one refresh timeout, cleaned up on unmount/data change; failures also support refocus/manual retry. Status labels and counts advance together from the next server snapshot, rather than independently guessing new totals in the browser. A polite refresh status is available without moving focus.

Only after verified database success, confirmation and cancellation call `revalidatePath('/dashboard')`. Confirmation also invalidates My bookings and space routes; cancellation retains its existing list/reservation/space invalidations. Errors do not invalidate or produce a success redirect. Existing review UUID generation, request-id retries, exclusion constraints, cancellation semantics and final conflict handling are unchanged.

## Setup

**No new migration, seed, grant or Supabase setting is required for this Dashboard task.** It reuses the already-existing RPC from `supabase/migrations/20261026000100_add_booking_cancellation.sql`, together with the established catalog/reservation migrations. The user has also reported applying `20261027000100_prevent_user_booking_overlaps.sql`; that protection is unchanged. Do not rerun previously applied SQL or seeds. If the RPC is absent, inspect/reconcile the intended project's existing migration history before any manual setup; do not blindly push or rerun earlier files.

No remote database changes, real reservations, account creation, email, commits, pushes or deployment were performed by the agent.

## Reference access and limits

The Figma Make link was inspected with the design-to-code skill. Its context endpoint returned source resource links, but readable source was unavailable through the connected resource interface; session/screenshot tools reported Make files unsupported. The embedded browser preview was accessible and its empty Dashboard copy, cards and spacing were inspected. Opening the observed preview URL directly returned Unauthorized, so that was not used to bypass access. The accessible embedded preview currently had no bookings; no prototype reservation was created to populate it. No screenshot attachments arrived with this request. Therefore populated-reference fidelity and full desktop comparison remain limited; the populated card uses the explicitly requested fields and existing Roomly booking styles, and the two-column desktop arrangement follows the request. No unseen design content or assets are claimed as extracted. Prototype identities, dates, counts and references were not copied into production.

## Verification and remaining hosted checks

Local tests are distinct from user-reported hosted results recorded in `bookings.md`. Unit tests mock session/database transport; browser fixtures are visibly labeled development previews and are isolated under `tests/`. The disposable PostgreSQL runner uses local fake auth-schema identities and no Supabase connection. It verifies the existing bounded RPC against full-history category counts at the returned exact server boundary and the first four owned confirmed not-ended entries, alongside prior RLS/concurrency/idempotency/cancellation checks.

Pending hosted steps, using existing bookings and accounts:

1. Open Dashboard and My bookings in the same verified session; compare all three totals away from a booking boundary. Confirm the featured UUID is the earliest not-ended confirmed reservation, with up to three distinct subsequent plans. Check empty and single-booking copy when those states naturally exist.
2. Inspect an ongoing reservation and a start/end boundary while open. Confirm refocus refreshes the snapshot and ended/cancelled reservations are not featured. Verify actual Chicago date/time, elapsed duration and UUID links.
3. Check owner-only detail links, accessible space links, and generic metadata/photo fallback for an intentionally inactive/unreadable space. Never fabricate hidden catalog details.
4. Following a separately authorized real confirmation or cancellation, return to Dashboard and confirm updated counts/entries. Do not create or cancel real reservations merely to perform this task's checks.
5. Sign out and sign in with a different existing account; verify profile and booking data belong only to that account, including refresh/history navigation. Expired/anonymous access must still redirect. Check the live mobile sidebar/layout and retry after a genuine transient read failure if encountered.

Historical shell checks from 2026-10-16 covered profile names, Chicago dates, auth guards, desktop collapse and mobile navigation; My bookings/cancellation have since replaced the original placeholder. Their verification history remains in `authentication.md` and `bookings.md`. The earlier default Turbopack worker limitation remains outside this integration; production validation uses the existing Webpack build command.

### Recorded agent results — 2026-10-28

- All 144 Vitest tests across 21 files passed, including Dashboard empty/one/ongoing/multiple/restricted/error/loading states, four distinct entries versus full counts, snapshot boundaries, sequential caller isolation, and confirmed-success-only Dashboard revalidation from both mutation actions. The viewer/profile tests retain auth guards and now verify the server-supplied Auth identity key.
- Lint and explicit Next route-generation/TypeScript checks passed.
- The expanded disposable PostgreSQL 17 suite passed. The existing bounded RPC was checked under each local test owner's RLS and column grants against full-history counts and the first four confirmed not-ended UUIDs using the exact returned `now`. All previous overlap, concurrent requests, idempotency, cancellation, metadata and personal-read checks also passed. No remote database was contacted.
- The full isolated catalog/booking/personal-conflict/My bookings/Dashboard browser suite passed. Dashboard was checked at 1574/1056/768/390/320px, including desktop column positions, collapse, loading/error/retry, category/detail/space links, missing metadata, full counts versus visible entries, refocus and simulated start/end boundaries. Mocked browser auth events also verified immediate removal of old profile/booking/totals on a different identity or sign-out, followed by an empty new-account snapshot; these are fixture events, not real authentication. Desktop/mobile populated and empty screenshots were visually inspected and saved under ignored `.tools/dashboard-preview/`.
- The final Webpack production build passed. Earlier attempts hit intermittent Windows `EPERM` creating generated `.next` directories; a later completed build was interrupted by the existing Next.js 16.4.0 security advisory, then the same build passed on retry. Dependencies were not changed. The reported security upgrade remains recommended/pending, and the default Turbopack limitation is unchanged.
- All 8 existing production desktop/mobile authentication/landing tests passed against the final build, using cleared Supabase configuration and no real accounts or bookings.
- `git diff --check` passed. Migrations, seeds, grants, RLS, RPC definitions, catalog, gallery and personal-conflict implementation have no changes from this task. No commit, push or deployment occurred.

The existing signed-in app tab was unavailable to the browser tool for a read-only check, so no hosted Dashboard data/session verification is claimed. No new login, account, real confirmation or cancellation was attempted. The manual checks above remain pending.
