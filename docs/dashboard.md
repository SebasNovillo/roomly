# Authenticated workspace

Implemented on 2026-10-16 using the existing Next.js application, React, Lucide icons, and Roomly logo. Public landing and authentication pages retain their existing styles; workspace tokens are scoped to `.roomly-app`.

## Routes and identity

- `/dashboard`: real profile name, date in America/Chicago (updates while open), next-booking and upcoming-plans empty states, quick actions, and booking overview with unavailable values rather than fabricated counts.
- `/dashboard/spaces`: replaced by the Supabase-backed catalog and `/dashboard/spaces/[slug]` detail route on 2026-10-20; see `docs/spaces.md` for the new manual migration/seed and verification status.
- `/dashboard/bookings`: intentional booking-management placeholder with useful navigation.

The layout and each page verify identity through `getViewer()` before rendering. The helper uses the existing request-scoped Supabase client and `auth.getUser()`, then selects only the verified user's profile name. It retains the profile-unavailable fallback. React cache deduplicates within a request. No booking data, tables, remote migrations, or mock authentication were added. Sign-out still uses the existing POST Server Action.

The shared sidebar supports desktop collapse. At widths below 1024px, navigation opens in a native modal dialog with an accessible name, focus containment, Escape dismissal, focus return, background scroll locking, active-page indicators, and a close button. Crossing into desktop closes the mobile dialog. A skip link leads to main content.

## Reference access

The supplied Figma Make project was reachable in the browser preview. Its dashboard empty state and mobile drawer were visually inspected. The Figma connector could list source resources but could not read them, and its screenshot endpoint does not support Make files. Screenshot attachments were not exposed in the conversation. This implementation follows the visible browser reference, with copy that clearly explains unavailable booking features and existing project typography/logo; exact source assets/styles and full desktop design fidelity remain unverified.

## Verification

- ESLint and Next route generation/TypeScript passed.
- Vitest: 7 files, 43 tests passed, including unauthenticated guards on every workspace page/layout, selecting the verified user's profile, profile failure fallback, and Chicago dates across UTC midnight and daylight/standard time.
- Production build passed with `npm run build -- --webpack` on bundled Node 24.19.0. Default Turbopack build failed while starting its CSS worker (worker exited before connecting), including outside the sandbox. No build configuration or dependencies were changed to conceal this limitation.
- Existing Playwright suite: 8 desktop/mobile tests passed against the production server with Supabase variables cleared, including public landing, authentication validation, confirmation errors, and redirects for the new protected destinations.
- Existing signed-in browser session: dashboard displayed the real profile name; desktop collapse and the Explore spaces route worked. No accounts were created and no sign-out was triggered during these checks.
- Isolated actual-component layout checks at 1440px, 768px, 390px, and 320px passed: no horizontal overflow, collapse, mobile dialog opening, Escape/focus return, placeholder navigation, desktop resize cleanup, and no page errors. Screenshots were visually inspected. The local harness adapts Next routing and prevents invoking the sign-out action; it tests UI behavior, not live authentication. The in-app browser viewport override did not change its actual reported size, so signed-in mobile integration was not independently verified there.

Pending from the shell work: booking implementation, full desktop reference comparison, signed-in mobile integration, the default Turbopack worker issue, and the unverified security checks listed in `authentication.md`. The subsequent space catalog's checks and outstanding database setup are documented separately in `spaces.md`. No migration rerun, remote database changes, commit, push, or deployment occurred during the shell work.
