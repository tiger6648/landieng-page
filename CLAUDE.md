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
- Fields: name, phone, email, message (max 2000 chars). All are required. Phone accepts Korean formats with or without hyphens (e.g. `010-1234-5678`). Validation messages are in Korean.
- The inputs are controlled components (`useState`) with `noValidate` on the form, so validation is handled entirely by `validateContact()`, not by browser constraint validation.

## Database

- Supabase Postgres via Drizzle ORM (`postgres` driver, `prepare: false` for the transaction-mode pooler). `DATABASE_URL` is in `.env` (gitignored).
- Schema: `src/db/schema.ts`. Client: `src/db/index.ts` (`db`). Migrations are in `drizzle/` and configured in `drizzle.config.ts`.
- To change the schema, edit `schema.ts`, then run `npx drizzle-kit generate` and `npx drizzle-kit migrate`.
- After a successful insert, `notifyAdminOfContact()` (`src/lib/notify.ts`) emails the admin via Resend (`RESEND_API_KEY`, `ADMIN_EMAIL`, optional `RESEND_FROM_EMAIL` in `.env`). Reply-To is the submitter's email. It never throws; if the env vars are missing or sending fails, it only logs. The default sender `onboarding@resend.dev` can only deliver to the Resend account's own email until a domain is verified.
- `contacts` has RLS enabled with no policies, so the Supabase public API (anon key) can't read it. Only the server connection can.

## Repository

- Remote: `origin` → https://github.com/tiger6648/landieng-page.git (the repo name contains a typo, "landieng"). The branch is `main`.
- `.claude/launch.json` defines a `dev` preview config (`npm run dev`, port 3000).
