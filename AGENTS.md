# AGENTS.md

This file is the project-specific guide for agents working in this repository.

## 1) Project Summary
- App type: Korean/English typing practice plus mini-game web app
- Stack: Next.js 15 (App Router) + React 18 + TypeScript
- State: Zustand (`src/store/store.ts`)
- Styling: Tailwind CSS with root `dark` class
- Routing: Next.js App Router (`app/`)
- Canonical production URL: `https://key-work-rho.vercel.app`

## 2) Commands
- Dev server: `npm run dev`
- Build: `npm run build`
- Production build: `npm run build:prod`
- Lint: `npm run lint`
- Preview: `npm run preview`

Notes:
- Vitest + Testing Library is configured.
- For validation, run `npm run lint`, `npm run build`, and `npm run test:run` by default.

## 3) Core Structure
- Entry point: `app/layout.tsx`
- Root redirect: `app/page.tsx` -> `/practice`
- Routes (App Router):
  - `app/(game)/practice/page.tsx`
  - `app/(game)/falling-words/page.tsx`
  - `app/(game)/typing-defense/page.tsx`
  - `app/(game)/typing-race/page.tsx`
  - `app/(game)/dictation/page.tsx`
  - `app/(game)/word-chain/page.tsx`
- Route group layout: `app/(game)/layout.tsx`
- Shared game shell: `src/components/AppFrame.tsx`
- Main game renderer: `src/components/MainLayout.tsx`
- Test setup: `vitest.config.ts`, `tests/setup.ts`
- Global store: `src/store/store.ts`
  - Persisted keys include `darkMode`, `language`, `highScore`, `difficulty`
  - Current mode is tracked by `gameMode`

## 4) Domain Rules (Important)
- For Korean typing accuracy/keystroke logic, use `src/utils/hangulUtils.ts`.
- If Korean comparison logic changes, keep consistency with `src/utils/levenshtein.ts`.
- Typing-related features must work for both languages and use `src/data/*.json`.

## 5) Implementation Principles
- Follow existing patterns:
  - Keep UI in Tailwind utility style
  - Keep global state in Zustand patterns used in this repo
  - If adding routes, update both `app/(game)/**/page.tsx` and navigation in `src/components/MainLayout.tsx` / `src/components/SideNav.tsx`
- Prefer small, scoped changes over broad refactors.
- Keep type safety high; avoid `any` unless absolutely necessary.
- Guard browser-only APIs (`window`, `AudioContext`) as existing components do.
  - See `src/components/TypingInput.tsx` and `src/components/FallingWordsGame.tsx`.

## 6) Cautions
- Encoding:
  - Some docs/comments may display Korean text incorrectly in some terminals.
  - Keep file encoding in UTF-8.
- Dependency cleanup:
  - Verify real import usage before removing packages.
- Deployment settings:
  - Vercel project must use `Framework Preset: Next.js`.
  - Keep `Output Directory` empty for Next.js (do not use `dist`).
  - Use Node.js `20.x` in Vercel project settings.

## 7) Completion Checklist
1. Only intended files are changed.
2. Lint passes: `npm run lint`
3. Build passes: `npm run build`
4. Tests pass: `npm run test:run`
5. Route/store changes are reflected in all related files.
6. No Korean/English typing regression, especially in accuracy logic.

## 8) Recommended Commit Scope
- One feature or one bug fix per commit.
- Preferred prefixes:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `chore: ...`
