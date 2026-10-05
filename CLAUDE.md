# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev`: dev server at http://localhost:3000 (Turbopack)
- `npm run build`: production build (also type-checks)
- `npm run lint`: ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript)
- `npx tsc --noEmit`: type-check only

There is no test framework set up.

## Project

A Korean-language landing page with a contact (문의) form, built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4.

- `src/` layout with the `@/*` → `./src/*` import alias.
- The form UI is in `src/components/ContactForm.tsx`, rendered by `src/app/page.tsx`. `src/app/layout.tsx` sets `lang="ko"`.
- Tailwind v4 is configured CSS-first in `src/app/globals.css` via `@import "tailwindcss"` and `@theme inline`. There is no `tailwind.config.*`. Components support dark mode with `dark:` variants (driven by `prefers-color-scheme`).

## Contact form

- Submitting validates on the client, then calls the `submitContact` Server Action (`src/app/actions.ts`). The action re-validates and inserts a row into the `contacts` table. Validation lives in `src/lib/contact.ts` (`validateContact()`) and is shared by both sides, so change rules there.
- Fields: name (max 50), phone, email (max 254), message (max 2000). All are required. Phone accepts Korean formats with or without hyphens (e.g. `010-1234-5678`). Validation messages are in Korean.
- The length limits are defined twice: as constants in `src/lib/contact.ts` and as `varchar` lengths in `src/db/schema.ts`. If you change one, change the other and generate a migration.
- The inputs are controlled components (`useState`) with `noValidate` on the form, so validation is handled entirely by `validateContact()`, not by browser constraint validation.
- `submitContact` and the admin's `updateContact` take a plain `ContactValues` object, not `FormData`. Clients call them inside `useTransition` and get back a `{ ok, errors?, formError? }` result. Because a Server Action can be called directly, each one trims the input with `String(...)` and validates it again before writing.
- After a successful insert, `notifyAdminOfContact()` (`src/lib/notify.ts`) emails the admin via Resend. Reply-To is the submitter's email. It never throws; if the env vars are missing or sending fails, it only logs, and the submission still succeeds. The default sender `onboarding@resend.dev` can only deliver to the Resend account's own email until a domain is verified.

## Database

- Supabase Postgres via Drizzle ORM (`postgres` driver, `prepare: false` for the transaction-mode pooler).
- Schema: `src/db/schema.ts`. Client: `src/db/index.ts` (`db`). Migrations are in `drizzle/` and configured in `drizzle.config.ts`, which loads `.env` through `@next/env`.
- `src/db/index.ts` throws when it is imported if `DATABASE_URL` is missing, so any route that imports `db` fails without `.env`.
- To change the schema, edit `schema.ts`, then run `npx drizzle-kit generate` and `npx drizzle-kit migrate`.
- `contacts` has RLS enabled with no policies, so the Supabase public API (anon key) can't read it. Only the server connection can.

## Admin page

- `/admin` lists contacts (newest first) and can edit (inline, validated with `validateContact()`) or delete them. Each card is `src/app/admin/ContactItem.tsx`.
- Each contact can have multiple admin notes (`contact_notes` table, FK with `ON DELETE CASCADE`). The page loads all notes in one `inArray` query and groups them by contact, oldest first. The UI is `src/app/admin/ContactNotes.tsx`, the actions are `addNote`, `updateNote` and `deleteNote`, and validation (max 1000 chars) is `validateNote()` in `src/lib/note.ts`. `updateNote` sets `updatedAt` to the DB's `now()` (same clock as `createdAt`), and a note shows "(수정됨)" when `updatedAt > createdAt`. `/admin/login` is a single shared password login (`ADMIN_PASSWORD` in `.env`). Both pages are `noindex`.
- The session is an httpOnly cookie `admin_session` holding `<expiresAt>.<HMAC-SHA256>`, signed with `ADMIN_SESSION_SECRET` (32+ chars). It lasts 7 days. The logic is in `src/lib/admin-session.ts`. There is no proxy/middleware. `src/app/admin/page.tsx` and every admin Server Action (`src/app/admin/actions.ts`) call `isAdminAuthenticated()` themselves, so keep that check in any new admin page or action.
- Changing `ADMIN_SESSION_SECRET` logs out every session. If `ADMIN_PASSWORD` is unset, or the secret is unset or shorter than 32 characters, login always fails and `/admin/login` shows a setup notice instead of the form.

## Analytics (PostHog)

- `posthog-js` is initialized in `src/instrumentation-client.ts`. It does nothing if `NEXT_PUBLIC_POSTHOG_KEY` is unset. Pageviews are automatic (`defaults` option).
- Events go through a same-origin reverse proxy at `/ingest` (rewrites in `next.config.ts`, region from `NEXT_PUBLIC_POSTHOG_REGION`) so ad blockers don't drop them. `NEXT_PUBLIC_*` values are inlined at build time, so restart or rebuild after changing them.
- `before_send` drops every event on `/admin*`, because admin pages show contact PII.
- `ContactForm` captures `contact_form_submitted` and `contact_form_invalid` (`fields`: names of invalid fields). Never send the form values themselves.

## Environment variables

`.env` (gitignored, no example file) holds: `DATABASE_URL`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `RESEND_FROM_EMAIL` (optional), `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_REGION` (`us` or `eu`, default `us`).

## Repository

- Remote: `origin` → https://github.com/tiger6648/landieng-page.git (the repo name contains a typo, "landieng"). The branch is `main`.
- `.claude/launch.json` defines a `dev` preview config (`npm run dev`, port 3000 with `autoPort`, so the actual port can differ if 3000 is taken).
- The local path contains a comma (`landing,Page`), so quote paths in shell commands.
