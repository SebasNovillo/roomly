# Roomly authentication

## Implementation and trust boundaries

Next.js 16.4.0 uses `src/proxy.ts`, not `middleware.ts`. The refresh helper calls `auth.getClaims()` before rendering, copies refreshed cookies to the request and response, and retains the SSR library's cache headers across cookie writes. It runs only on auth/dashboard routes, leaving the landing page independent of Supabase. Those responses are private and not cached. Each server operation creates its own client with awaited Next.js cookies. The existing browser client remains available for future client interactions; these forms use Server Actions.

`/dashboard` independently calls `auth.getUser()` before querying a profile or rendering protected content. Sign out is a POST Server Action, verifies the current identity, revokes the current local session, clears the project's auth cookies, and redirects to sign in. It does not sign out other devices. Do not use user metadata for authorization: `full_name` is display data only. There are no application roles.

Sign-in and registration validate with Zod on the server. Passwords are never trimmed or returned in action state. Auth provider errors are replaced with controlled English messages. Only `/` and `/dashboard` are accepted as post-auth destinations; all other input resolves to `/dashboard`. Confirmation accepts only `type=email`, calls `verifyOtp`, writes the SSR cookies and removes the token from the redirect URL. Missing, invalid, reused and expired links lead to `/sign-in?error=confirmation` with an accessible error message. There is no automatic email resend; use the project's Auth administration to resend if necessary.

No code logs passwords, tokens or environment values. Incoming Next.js development request logging is disabled because confirmation URLs contain token hashes. When configuring hosting, exclude/redact query strings on `/auth/confirm` from access logs and monitoring; never store these URLs in analytics. Confirmation responses set `Referrer-Policy: no-referrer` and `Cache-Control: private, no-store`. Do not cache authenticated routes at a CDN.

## Required Supabase setup (manual; not applied by this task)

1. Keep the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Git-ignored `.env.local`. No service-role key is needed. Restart development after changes; rebuild production after changes to public values.
2. In Authentication → Sign In / Providers → Email, enable the email provider, email/password registration, and **Confirm email**. Set the minimum password length to at least 8 to match this form. If you enable additional password requirements, align the form's validation/help text with them.
3. In Authentication → URL Configuration, set **Site URL** to exactly `http://localhost:3000` for local development, without a trailing slash. The confirmation template below uses this fixed URL. It does not trust the incoming request Host or user input. To test from another device on the LAN, deliberately change Site URL to `http://10.0.0.160:3000` and use that origin throughout registration and confirmation. Do not use localhost on the other device.
4. Add the exact redirect URL `http://localhost:3000/auth/confirm` (and `http://10.0.0.160:3000/auth/confirm` only if using LAN development) to **Redirect URLs**. No wildcard is necessary. This implementation does not pass `emailRedirectTo`; the template uses Site URL directly. The redirect allowlist is not a substitute for changing Site URL in step 3.
5. In Authentication → Email Templates → **Confirm signup**, replace the confirmation link with this exact HTML:

   ```html
   <h2>Confirm your Roomly account</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">Confirm your email</a></p>
   ```

   Do not use `{{ .ConfirmationURL }}` for this flow. The app needs `token_hash` on its server endpoint to establish an SSR session. The template intentionally omits a dynamic destination and always defaults to `/dashboard` after verification. Configure a working sender/SMTP for intended recipients and review Supabase email limits before manual registration. For production, replace Site URL and redirect entries with the actual HTTPS application origin and its exact `/auth/confirm` URL; no production hostname is assumed here.
6. Ensure the Data API is enabled and `public` is an exposed schema. Keep automatic exposure/grants disabled: the migration explicitly grants only the required table/column privileges. Exposing a schema alone does not grant access to other tables.
7. Apply the migration below before testing registration.

## Applying the profile migration

The versioned migration is `supabase/migrations/20261014000100_create_profiles.sql`. **It has been prepared locally, not run against your project.** Review it, select the intended Supabase project, open SQL Editor as the database owner, paste the complete file and run it once. Keep this filename as the migration record. If you already manage this project with the Supabase CLI, bring this file into that existing migration history and apply it through your established migration process instead; do not apply it through both methods.

The transaction creates `public.profiles`, its registration trigger, update timestamp trigger, RLS policies and explicit grants. It backfills existing users with their metadata name or `Member`. New profiles get `America/Chicago` from the database default; metadata cannot supply a different identity, timestamps or privilege. The trigger's definer function has an empty search path, fully qualified table names, a checked trigger context and no client execution grants. Its schema is private. Authenticated users can select their own row and update only `full_name` and `timezone`; no client can insert/delete profiles, change IDs or write timestamps. RLS enforces ownership for both reads and updates.

This is a one-time migration; it deliberately fails if a conflicting `profiles` table exists instead of overwriting it. Inspect an existing schema and reconcile it before applying. A trigger failure can block registration, so run the manual flow after applying. No local PostgreSQL/Supabase database is assumed by the automated TypeScript tests; database execution and RLS behavior must also be verified in your project or local Supabase environment.

If the migration is absent, Supabase Auth may still register/sign in users, but the profile query can fail or return no row. The dashboard shows a profile-unavailable message and uses the verified user's metadata name for display. This is a separate database setup issue, not proof that authentication code failed. Do not treat that fallback as verification of the profile table or RLS.

After applying, inspect SQL Editor results for the table's enabled RLS, the two policies, the trigger and grants. With two manually created confirmed test users, use their authenticated clients to verify: each can read only their own profile; updating their own name/timezone succeeds and advances `updated_at`; updating another user's row affects zero rows; attempts to insert/delete or update `id`, `created_at` or `updated_at` fail; anonymous reads fail. Never test isolation as the SQL Editor owner, which can bypass RLS.

## Automated and manual verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:e2e`. Unit tests mock Supabase and test server validation, check-email/no-session behavior, a returned session, safe destinations, controlled provider errors, sign out, confirmation failure/success, unauthenticated authorization and refresh cookie/header propagation. Playwright tests desktop and mobile against a production server on port 3100 with Supabase variables cleared: landing links, form validation, password visibility, invalid confirmation handling and unauthenticated dashboard redirects. These tests cannot create a real account or send email and do not establish live Supabase connectivity.

Manual checks after configuration and migration, using an account you choose to create:

1. Open `/dashboard` in a signed-out/private browser. Confirm it redirects to sign in without protected content. Submit incomplete/malformed forms and verify inline errors; keyboard-test labels, focus, show/hide controls and pending buttons.
2. Register at `/sign-up` with a real inbox you control, full name, strong password and matching confirmation. With Confirm email enabled, verify **Check your email** appears without a dashboard session. Do this manually; automated tests do not submit real registrations.
3. Open the email link. It should reach `/auth/confirm`, then `/dashboard` with your name and cookie session. Reload the page and confirm it remains signed in. Confirm the profile exists, its name matches and timezone is `America/Chicago`.
4. Reopen the same link and try an expired/invalid link; verify a clear confirmation error and no token in the final URL. Email scanners can consume one-use GET confirmation links; resend from Auth administration if needed.
5. Sign out with the button. Confirm a POST action redirects to `/sign-in`, clears local auth cookies, and `/dashboard` is inaccessible after reload/back navigation. Sign in with the confirmed email/password, reload, and sign out again. Test a wrong password and an unconfirmed email without exposing provider internals.
6. Keep a session past its access-token expiry, then reload `/dashboard` to verify refresh and cookie propagation with the actual project. Also test a revoked session. Automated mocked tests do not establish this live behavior.

## Figma reference access

The Figma design-to-code skill was loaded and `get_design_context` was called for Make file `Fwdsc61ZyEp367TAkDlSH8`, node `0:1`, requesting the default screenshot. The response lists source/image resource links but no screenshot or readable code. Reading `src/App.tsx` returns **Unknown resource**. The screenshot tool reports that Make files are unsupported. The account is authenticated; accessible auth screens, their assets and interactions could not be inspected. Screenshots of sign-in/registration or an exported source bundle are still required for accurate visual matching. Current forms reuse the repository's logo, semantic tokens and styles and are a functional implementation, not a claimed match to inaccessible screens.

## Verification recorded for this implementation

- Node 24.19.0 and the repository's npm 12.2 tooling: lint, route type generation/TypeScript and production build passed.
- Vitest: 6 files, 36 tests passed. Supabase responses are mocked; no live registration requests were made.
- Playwright: 8 tests passed across desktop/mobile Chromium using the production build and cleared Supabase variables.
- Integrated development preview: sign-in and registration rendered; navigating to `/dashboard` redirected to sign in; no browser warning/error logs were captured in the final check.
- `.env.local` exists, remains ignored and untracked; `.env.example` and dependency manifests were not changed.
- Migration execution, database grants/RLS enforcement and the real registration → email confirmation → login → reload/refresh → logout lifecycle have not been verified. No successful live Supabase request is claimed. No remote database changes, account creation, email sending, commit, push or deployment was performed.

## Official references consulted

- [Supabase SSR and Next.js 16 proxy](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase email templates and token hashes](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase user profiles and triggers](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Next.js proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
