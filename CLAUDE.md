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

- The form is **UI only, with no backend**. The owner explicitly asked not to implement one. Submitting runs client-side validation (`validate()`), then shows a success message and clears the fields. Nothing is sent anywhere. Don't add Server Actions, API routes, or email/DB integrations unless asked. The hook point is the comment in `handleSubmit`.
- Fields: name, phone, email, message (max 2000 chars). All are required. Phone accepts Korean formats with or without hyphens (e.g. `010-1234-5678`). Validation messages are in Korean.
- The inputs are controlled components (`useState`) with `noValidate` on the form, so validation is handled entirely by `validate()`, not by browser constraint validation.

## Repository

- Remote: `origin` → https://github.com/tiger6648/landieng-page.git (the repo name contains a typo, "landieng"). The branch is `main`.
- `.claude/launch.json` defines a `dev` preview config (`npm run dev`, port 3000).
