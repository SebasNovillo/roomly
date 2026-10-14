# Roomly

Roomly is a shared-space booking application with a responsive English home page and Supabase email/password authentication: sign in, registration, email confirmation, a protected dashboard and POST sign out. The home page and production build work without Supabase credentials. Authentication requires project configuration; profiles require a manually applied migration. See [authentication setup and verification](docs/authentication.md) for exact steps and remaining Figma access limitations.

## Prerequisites

- Node.js 24 LTS, version 24.15 or newer within major 24 (`.nvmrc` pins 24.19.0).
- npm 12.2 (install with `npm install --global npm@12.2.0` if needed).
- Git, using the existing repository.

Dependencies use stable releases selected from the npm registry. Next.js and its ESLint configuration use the same version; React and React DOM match. ESLint and TypeScript are pinned to versions compatible with the React and TypeScript ESLint plugins. `package-lock.json` fixes the complete dependency graph; keep it in version control and use `npm ci` for reproducible installation.

## Installation

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No environment file is needed for the initial page. The application uses local system fonts and does not fetch fonts or images at build time.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Serve an existing production build |
| `npm run lint` | Run ESLint, treating warnings as failures |
| `npm run typecheck` | Generate Next.js route types and run strict TypeScript checks |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Watch unit tests during development |
| `npm run test:e2e` | Run home and auth checks in desktop and mobile Chromium |

Before running end-to-end tests for the first time:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

On Linux CI hosts, use `npx playwright install --with-deps chromium`. Playwright starts and stops the production server on port 3100; keep that port available. Its test server clears the Supabase variables. The tests verify the home page, account links, server form validation, password visibility, invalid confirmation handling and unauthenticated dashboard protection on desktop and mobile. They do not create accounts or send emails.

## Environment configuration

Copy `.env.example` to `.env.local` only when connecting a Supabase feature:

```sh
cp .env.example .env.local
```

PowerShell equivalent: `Copy-Item .env.example .env.local`.

Replace both placeholders:

- `NEXT_PUBLIC_SUPABASE_URL`: your project's HTTP(S) URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: your project's `sb_publishable_...` key.

These public values are included in browser bundles. Do not place a secret or service-role key here. Local environment files are ignored; `.env.example` is intentionally available for version control. Validation rejects missing, blank, malformed, and example values when a Supabase client factory is called. Errors identify variable names and remediation without printing their values. Validation is lazy, so importing utilities and building the home page do not require configuration.

Restart development after changing variables. Next.js embeds public variables at build time; rebuild production artifacts after changing them. Never use a public key as a substitute for database row-level security.

## Architecture

```text
src/
  app/                 App Router routes, root layout, and global Tailwind styles
  components/          Reusable UI, initially the Roomly wordmark
  features/
    auth/              Server auth actions and Zod form validation
    spaces/            Reserved for discovery and space details
    bookings/          Reserved for booking rules and workflows
    profile/           Profile scope notes; migration in supabase/migrations
  lib/
    env.ts             Shared, lazy Zod validation of public Supabase configuration
    supabase/client.ts Browser client factory, guarded by client-only
    supabase/server.ts Request-scoped server client, guarded by server-only
  proxy.ts             Next.js 16 session refresh for auth/dashboard routes
supabase/migrations/   Versioned profile schema, triggers, grants and RLS
docs/authentication.md Supabase setup, design limitations and manual checks
tests/e2e/             Production home and authentication tests
```

Routes and layouts are Server Components by default. Add Client Components only for interaction requiring browser state or APIs. Import browser and server factories directly from their respective files; do not re-export both through a shared barrel. Future backend work belongs in Next.js Route Handlers, Server Actions, and server-only feature modules; there is no Express server.

The Supabase factories follow the [official cookie-based SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=npm). The browser uses `createBrowserClient`; the server uses `createServerClient` with awaited Next.js cookies and `getAll`/`setAll`. The server instance is created per request. Server Components cannot write cookies; the adapter catches those attempts and `src/proxy.ts` refreshes sessions before rendering, preserving cookies and cache headers.

The proxy uses `auth.getClaims()`; the dashboard and sign-out action independently use `getUser()` for current server-verified identity. No protected content trusts `getSession()` alone. Profile access is protected by database RLS and column privileges. Apply the local migration before registering users. Booking persistence and database-enforced booking conflicts remain future work.

## Design and reference findings

Initial tokens in `src/app/globals.css` provide pale gray `background`, white `surface`, navy `ink`, indigo `primary`, and shared muted, border, and focus colors. Tailwind exposes them through semantic utility names. The home page has accessible landmarks, keyboard focus styles, an introduction anchor, and reduced-motion support.

The prior inspection of the [Figma Make reference](https://www.figma.com/make/Fwdsc61ZyEp367TAkDlSH8/Design-Explore-Spaces-Screen) verified pale backgrounds, white rounded surfaces, purple actions, and English text. Its integration listed eight source files and nineteen PNG resources, but reading source and assets failed with “Unknown resource.” Browser preview access did not provide reusable source files. The local repository contained only Git metadata and no AGENTS.md instructions or assets when setup began. This page uses those verified visual findings and the requested palette, rather than claiming to reproduce an inaccessible screen. Original photos and components can be reused when an accessible export is available.

## Current scope and CI

Implemented: application setup, introductory home page, shared styles, Supabase SSR authentication, server form validation, confirmation endpoint, protected dashboard, sign out, local profile migration, Vitest and Playwright tests, npm scripts and GitHub Actions. Remote configuration and migration are manual steps documented in `docs/authentication.md`; live account lifecycle and database/RLS checks remain manual.

Deferred: matching inaccessible Figma authentication screens, application sidebar, booking persistence, availability, cancellation, profile editing and all Admin features. There are no demo passwords, fake sessions, account selectors or localStorage booking records.

The GitHub Actions workflow installs the pinned npm version, runs `npm ci`, lint, type checking, unit tests, and a production build without live credentials. End-to-end tests are available locally and can be added to CI with browser installation later. Local dependencies, environment files, builds, test reports, traces, and temporary tooling are ignored.

No commits, pushes, deployments, or external service provisioning are part of this setup.
